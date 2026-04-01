import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// POST: Activate unclaimed meals for all eligible employees, interns, and trainees
export async function POST(request) {
  try {
    const results = [];

    // employees_meal: update only if mon_enabled, tues_enabled, etc. exist
    try {
      const updateEmployeesQuery = `
        UPDATE employees_meal
        SET mon_enabled = 1,
            tues_enabled = 1,
            wed_enabled = 1,
            thurs_enabled = 1,
            fri_enabled = 1,
            sat_enabled = 1,
            sun_enabled = 1
        WHERE rfid_tag = ?
      `;
      const res = await executeQuery({ query: updateEmployeesQuery, values: [rfid_tag] });
      results.push({ table: 'employees_meal', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      console.warn('activate-unclaimed: employees update failed (non-fatal):', err.message || err);
      results.push({ table: 'employees_meal', status: 'failed', error: err.message || String(err) });
    }

    // interns_meal: update only if mon_enabled, tues_enabled, etc. exist
    try {
      const updateInternsQuery = `
        UPDATE employees_meal
        SET mon_enabled = 1,
            tues_enabled = 1,
            wed_enabled = 1,
            thurs_enabled = 1,
            fri_enabled = 1,
            sat_enabled = 1,
            sun_enabled = 1
      `;
      const res = await executeQuery({ query: updateInternsQuery });
      results.push({ table: 'interns_meal', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      // if table doesn't have meal_count, skip gracefully
      if (String(err).includes('Unknown column') || String(err).includes('doesn\'t have column')) {
        console.info('activate-unclaimed: interns have no meal_count, skipping intern update.');
        results.push({ table: 'interns_meal', status: 'skipped', reason: 'no meal_count field' });
      } else {
        console.warn('activate-unclaimed: interns update failed (non-fatal):', err.message || err);
        results.push({ table: 'interns_meal', status: 'failed', error: err.message || String(err) });
      }
    }

    // trainees_meal: update only if mon_enabled, tues_enabled, etc. exist
    try {
      const updateTraineesQuery = `
        UPDATE employees_meal
        SET mon_enabled = 1,
            tues_enabled = 1,
            wed_enabled = 1,
            thurs_enabled = 1,
            fri_enabled = 1,
            sat_enabled = 1,
            sun_enabled = 1
      `;
      const res = await executeQuery({ query: updateTraineesQuery });
      results.push({ table: 'trainees_meal', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      if (String(err).includes('Unknown column') || String(err).includes('doesn\'t have column')) {
        console.info('activate-unclaimed: trainees have no meal_count, skipping trainee update.');
        results.push({ table: 'trainees_meal', status: 'skipped', reason: 'no meal_count field' });
      } else {
        console.warn('activate-unclaimed: trainees update failed (non-fatal):', err.message || err);
        results.push({ table: 'trainees_meal', status: 'failed', error: err.message || String(err) });
      }
    }

    const failed = results.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      console.error('activate-unclaimed: some updates failed', failed);
      return NextResponse.json({ error: 'Failed to activate unclaimed meals for all groups', details: results }, { status: 500 });
    }

    return NextResponse.json({ message: 'Unclaimed meals activated successfully', details: results });
  } catch (err) {
    console.error('Failed to activate unclaimed meals:', err);
    return NextResponse.json(
      { error: 'Failed to activate unclaimed meals', details: err.message || String(err) },
      { status: 500 }
    );
  }
}