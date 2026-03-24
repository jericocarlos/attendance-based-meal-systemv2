import { NextResponse } from 'next/server';
import { executeQuery, attendancePool } from '@/lib/db';
// import { time } from 'zod';

export async function POST(request) {
  try {
    const { rfid_tag, ashima_id, time_claimed } = await request.json();

    console.log("📥 Received POST /api/attendance/add with data:", { rfid_tag, ashima_id, time_claimed });

    // Allow searching by either RFID tag or ashima_id
    const searchParam = ashima_id ?? rfid_tag;
    if (!searchParam) {
      return NextResponse.json(
        { error: 'rfid_tag or ashima_id is required.' },
        { status: 400 }
      );
    }

    // Normalize incoming fields and log for clarity (show null instead of undefined)
    console.log("Received request with:", {
      rfid_tag: rfid_tag ?? null,
      ashima_id: ashima_id ?? null,
      time_claimed: time_claimed ?? null
    });

    // Normalize time_claimed if provided
    const timeParamRaw = time_claimed ? String(time_claimed).replace('T', ' ') : null;
    const timeForQueries = timeParamRaw || new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Find person by either rfid or id (employees/interns/trainees)
    const employeeQuery = `
      SELECT 
          e.id AS person_id,
          e.ashima_id,
          e.name,
          d.name AS department,
          p.name AS position,
          e.photo,
          e.status,
          'employee' AS person_type,
          e.is_enabled,
          e.meal_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.rfid_tag = ? OR e.ashima_id = ?

      UNION ALL

      SELECT 
          i.id AS person_id,
          i.id_number as ashima_id,
          i.name,
          d.name AS department,
          p.name AS position,
          i.photo,
          i.status,
          'intern' AS person_type,
          i.is_enabled,
          null as meal_count
      FROM interns i
      LEFT JOIN departments d ON i.department_id = d.id
      LEFT JOIN positions p ON i.position_id = p.id
      WHERE i.rfid_tag = ? OR i.id_number = ?

      UNION ALL

      SELECT 
          t.id AS person_id,
          t.ashima_id,
          t.name,
          d.name AS department,
          p.name AS position,
          t.photo,
          t.status,
          'trainee' AS person_type,
          t.is_enabled,
          null as meal_count
      FROM trainees t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN positions p ON t.position_id = p.id
      WHERE t.rfid_tag = ? OR t.ashima_id = ?;
    `;

    const [employee] = await executeQuery({
      query: employeeQuery,
      values: [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam],
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'PERSON NOT FOUND ON QUALIFIED FREE MEAL LIST.\nKINDLY CONTACT HR DEPARTMENT FOR ASSISTANCE.' },  //'Person not found on Qualified Free Meal List.Kindly contact HR Department for assistance.' },
        { status: 404 }
      );
    }

    if (employee.photo) {
      employee.photo = `data:image/png;base64,${Buffer.from(employee.photo).toString('base64')}`;
    }

    // Find latest log for the target date (DATE(time_claimed) = DATE(provided_time))
    const latestLogQuery = `
      SELECT * FROM freemeal_logs
      WHERE ashima_id = ?
      AND DATE(time_claimed) = DATE(?)
      ORDER BY time_claimed DESC
      LIMIT 1
    `;

    const [latestLog] = await executeQuery({
      query: latestLogQuery,
      values: [employee.ashima_id, timeForQueries],
    });
    const attendanceConn = await attendancePool.getConnection();

    let nextLogType = "CLAIMED";
    let insertLogQuery = "";
    let insertLogValues = [];

    const today = timeParamRaw ? new Date(timeParamRaw) : new Date();
    const claimedDate = new Date(latestLog?.time_claimed);
    const dateOnly = timeForQueries.slice(0, 10);

    console.log("🕒 Processing free meal log for:", employee.name, "on", today.toDateString());

    const isSameDay = latestLog &&
      claimedDate.getDate() === today.getDate() &&
      claimedDate.getMonth() === today.getMonth() &&
      claimedDate.getFullYear() === today.getFullYear();

    if (!latestLog || !isSameDay) {
      // No log for that day → create a CLAIMED (use provided time if present)
      nextLogType = "CLAIMED";
      if (timeParamRaw) {
        insertLogQuery = `
          INSERT INTO freemeal_logs (date_claimed, ashima_id, log_type, time_claimed, meal_type)
          VALUES (DATE(?), ?, 'CLAIMED', ?, ?)
        `;
        insertLogValues = [timeParamRaw, employee.ashima_id, timeParamRaw, employee.person_type];
       // await attendanceConn.ping();
        console.log('SAS DB connected 1');
      } else {
        insertLogQuery = `
          INSERT INTO freemeal_logs (date_claimed, ashima_id, log_type, time_claimed, meal_type)
          VALUES (CURDATE(), ?, 'CLAIMED', NOW(), ?)
        `;
        insertLogValues = [employee.ashima_id, employee.person_type];
        //await attendanceConn.ping();
        console.log('SAS DB connected 2');
      }

      console.log("✅ Free meal claimed for the target date.");
    } else if (latestLog.log_type === "CLAIMED" && !latestLog.flag && isSameDay) {
      nextLogType = "CLAIMED ALREADY";
      const updateQuery = `
        UPDATE freemeal_logs
        SET log_type = 'CLAIMED ALREADY', flag = 1
        WHERE id = ?
      `;
      await executeQuery({ query: updateQuery, values: [latestLog.id] });
      console.log("ℹ️ Meal already claimed earlier on this date. Status updated.");
      //await attendanceConn.ping();
      console.log('SAS DB connected 3');
    } else if (latestLog.log_type === "CLAIMED ALREADY" && isSameDay) {
      nextLogType = "Meal already claimed on that date. You cannot claim again.";
      console.log("❌", nextLogType);
      //await attendanceConn.ping();
      console.log('SAS DB connected 4');
    }

    // Check if claiming for Sunday after Monday 12:00 PM (when report is sent)
    const claimDate = new Date(timeForQueries);
    const dayOfWeek = claimDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek === 0) { // Claiming for a Sunday
      const now = new Date();
      const nextMonday = new Date(claimDate);
      nextMonday.setDate(nextMonday.getDate() + 1); // Monday after the Sunday
      nextMonday.setHours(12, 0, 0, 0); // Monday 12:00 PM
      
      if (now >= nextMonday) {
        const errorMessage = "Free meal cannot be claimed due to report for previous week already sent to HR.";
        console.log("❌", errorMessage);
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }
    }

    // ******************************* Attendance Check Start ************************************** //
    try {
      await attendanceConn.beginTransaction();
      // await freemealConn.beginTransaction();

      // 🔍 Check attendance first
      const [rows] = await attendanceConn.execute(
        `
        SELECT 1
        FROM attendance_logs
        WHERE ashima_id = ?
          AND DATE(in_time) = ?
        LIMIT 1
        `,
        [employee.ashima_id, dateOnly]
      );

      console.log(`🔍 Attendance check for ${employee.ashima_id} on ${dateOnly}:`, rows.length > 0 ? "Found attendance record." : "No attendance record found.");
      if (rows.length === 0) {
        const errorMessage = "No attendance record found for the selected date. Free meals can only be claimed by attendees.";
        console.log("❌", errorMessage);
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }else {
        console.log("✅ Attendance verified for the target date.");
        // Insert if needed
        // Proceed only if enabled & has attendance
        if (employee.is_enabled === 1) {
          // Check meal expiration for trainees
          if (employee.person_type === 'trainee') {
            const [traineeData] = await executeQuery({
              query: 'SELECT meal_expiration_date FROM trainees WHERE ashima_id = ?',
              values: [employee.ashima_id]
            });
            
            if (traineeData?.meal_expiration_date) {
              const expirationDate = new Date(traineeData.meal_expiration_date).toLocaleDateString('en-US');
              const todayFormatted = new Date().toLocaleDateString('en-US');

              console.log(employee.ashima_id, "meal expiration date:", expirationDate, "today:", todayFormatted);
              
              if (todayFormatted === expirationDate) {
                const errorMessage = "Trainee's meal expiration date has passed. Cannot claim meal. Kindly contact HR for assistance.";
                console.log("❌", errorMessage);
                return NextResponse.json(
                  { error: errorMessage },
                  { status: 400 }
                );
              }
            }
          }
          
          if (insertLogQuery) {
            await executeQuery({
              query: insertLogQuery,
              values: insertLogValues,
            });
          }
        } else {
          const errorMessage = "Free meal counter is disabled. Cannot claim meal.";
          console.log("❌", errorMessage);
          return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
          );
        }
      }

      await attendanceConn.commit();
      // await freemealConn.commit();

    } catch (err) {
      await attendanceConn.rollback();
      // await freemealConn.rollback();
      throw err;
    } finally {
      attendanceConn.release();
      // freemealConn.release();
    }

    // ******************************* Attendance Check End ************************************** //

    // // Insert if needed
    // // Proceed only if enabled & has attendance
    // if (employee.is_enabled === 1 && rows[0].attendance_count > 0) {
    //   if (insertLogQuery) {
    //     await executeQuery({
    //       query: insertLogQuery,
    //       values: insertLogValues,
    //     });
    //   }
    // } else {
    //   const errorMessage = "Free meal counter is disabled. Cannot claim meal.";
    //   console.log("❌", errorMessage);
    //   return NextResponse.json(
    //     { error: errorMessage },
    //     { status: 400 }
    //   );
    // }


    // Update meal_count or last_active as before
    if (employee.person_type === 'employee' && nextLogType === 'CLAIMED' && employee.meal_count > 0) {
      const updateMealCountQuery = `
        UPDATE employees
        SET meal_count = meal_count - 1, last_active = NOW()
        WHERE ashima_id = ?
      `;
      await executeQuery({ query: updateMealCountQuery, values: [employee.ashima_id] });
    }else if (employee.person_type === 'employee' && employee.meal_count == 0) {
      // throw error if meal_count is zero
      return NextResponse.json(
        { error: 'Your free meal reached its limit. Wait for your free meal to be refreshed on monday 12 noon.' },
        { status: 400 }
      );
    }else {
      const updateLastActiveQuery = `
        UPDATE employees
        SET last_active = NOW()
        WHERE ashima_id = ?
      `;
      await executeQuery({ query: updateLastActiveQuery, values: [employee.ashima_id] });
    }

    // Return the latest attendance entry for the (possibly manual) date
    const mergedLogsQuery = `
      SELECT id, log_type, time_claimed
      FROM freemeal_logs
      WHERE ashima_id = ?
      ORDER BY time_claimed DESC
      LIMIT 1
    `;
    const [attendanceLog] = await executeQuery({ query: mergedLogsQuery, values: [employee.ashima_id] });

    return NextResponse.json({
      employee,
      attendanceLog,
      logType: nextLogType
    });
  } catch (error) {
    console.error('Error processing free meal log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process free meal logs.' },
      { status: 500 }
    );
  }
}
