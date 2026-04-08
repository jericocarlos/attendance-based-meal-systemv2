import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// POST: Activate unclaimed meals for all eligible employees, interns, and trainees
export async function POST(request) {
  try {
    const results = [];

    // employees_meal: update only if monday, tuesday, etc. exist
    try {
      const updateEmployeesQuery = `
        UPDATE employees_unclaimed_meals
        SET monday = 1,
            tuesday = 1,
            wednesday = 1,
            thursday = 1,
            friday = 1,
            saturday = 1,
            sunday = 1
      `;
      const res = await executeQuery({ query: updateEmployeesQuery });
      results.push({ table: 'employees_unclaimed_meals', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      console.warn('activate-unclaimed: employees update failed (non-fatal):', err.message || err);
      results.push({ table: 'employees_unclaimed_meals', status: 'failed', error: err.message || String(err) });
    }

    // interns_unclaimed_meals: update only if monday, tuesday, etc. exist
    try {
      const updateInternsQuery = `
        UPDATE interns_unclaimed_meals
        SET monday = 1,
            tuesday = 1,
            wednesday = 1,
            thursday = 1,
            friday = 1,
            saturday = 1,
            sunday = 1
      `;
      const res = await executeQuery({ query: updateInternsQuery });
      results.push({ table: 'interns_unclaimed_meals', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      // if table doesn't have meal_count, skip gracefully
      if (String(err).includes('Unknown column') || String(err).includes('doesn\'t have column')) {
        console.info('activate-unclaimed: interns have no meal_count, skipping intern update.');
        results.push({ table: 'interns_unclaimed_meals', status: 'skipped', reason: 'no meal_count field' });
      } else {
        console.warn('activate-unclaimed: interns update failed (non-fatal):', err.message || err);
        results.push({ table: 'interns_unclaimed_meals', status: 'failed', error: err.message || String(err) });
      }
    }

    // trainees_unclaimed_meals: update only if monday, tuesday, etc. exist
    try {
      const updateTraineesQuery = `
        UPDATE trainees_unclaimed_meals
        SET monday = 1,
            tuesday = 1,
            wednesday = 1,
            thursday = 1,
            friday = 1,
            saturday = 1,
            sunday = 1
      `;
      const res = await executeQuery({ query: updateTraineesQuery });
      results.push({ table: 'trainees_unclaimed_meals', status: 'updated', affected: res.affectedRows ?? 0 });
    } catch (err) {
      if (String(err).includes('Unknown column') || String(err).includes('doesn\'t have column')) {
        console.info('activate-unclaimed: trainees have no meal_count, skipping trainee update.');
        results.push({ table: 'trainees_unclaimed_meals', status: 'skipped', reason: 'no meal_count field' });
      } else {
        console.warn('activate-unclaimed: trainees update failed (non-fatal):', err.message || err);
        results.push({ table: 'trainees_unclaimed_meals', status: 'failed', error: err.message || String(err) });
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