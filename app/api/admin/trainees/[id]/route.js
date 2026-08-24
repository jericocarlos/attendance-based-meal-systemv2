import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper function to decode Base64 to binary with better error handling
function decodeBase64ToBinary(base64String) {
  if (!base64String || typeof base64String !== "string") {
    console.log("Invalid or missing base64String");
    return null;
  }
  try {
    const base64Data = base64String.includes("data:image")
      ? base64String.replace(/^data:image\/\w+;base64,/, "")
      : base64String;
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    console.error("Error decoding base64 string:", error);
    return null;
  }
}

// PUT: Update an Existing Intern
export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "Trainee ID is required." },
        { status: 400 }
      );
    }
    const body = await req.json();

    const {
      ashima_id,
      name,
      department_id,
      position_id,
      rfid_tag,
      photo,
      status,
      meal_expiration_date,
      removePhoto
    } = body;

    const updateFields = [];
    const values = [];
    const isDiscontinued = status === "discontinued";

    if (ashima_id !== undefined) {
      updateFields.push("ashima_id = ?");
      values.push(ashima_id ?? null);
    }

    if (name !== undefined) {
      updateFields.push("name = ?");
      values.push(name ?? null);
    }

    if (department_id !== undefined) {
      updateFields.push("department_id = ?");
      values.push(department_id ?? null);
    }

    if (position_id !== undefined) {
      updateFields.push("position_id = ?");
      values.push(position_id ?? null);
    }

    if (isDiscontinued || rfid_tag !== undefined) {
      updateFields.push("rfid_tag = ?");
      values.push(isDiscontinued ? null : rfid_tag ?? null);
    }

    if (isDiscontinued || removePhoto || photo !== undefined) {
      updateFields.push("photo = ?");
      values.push(
        isDiscontinued || removePhoto ? null : decodeBase64ToBinary(photo)
      );
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      values.push(status ?? null);
    }

    if (meal_expiration_date !== undefined) {
      updateFields.push("meal_expiration_date = ?");
      values.push(meal_expiration_date ?? null);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: "At least one trainee field is required for an update." },
        { status: 400 }
      );
    }

    // mysql2 rejects undefined parameters; all optional values above are
    // omitted or normalized to null, and the route ID is validated above.
    values.push(id);

    const updateQuery = `
      UPDATE trainees 
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    const result = await executeQuery({ query: updateQuery, values });

    if (!result || result.affectedRows === 0) {
      return NextResponse.json(
        { message: "No trainee was updated. The trainee may not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Trainee updated successfully",
      traineeId: id,
      status: status,
      photoRemoved: status === "discontinued" || removePhoto
    });
  } catch (err) {
    console.error("Failed to update trainee:", err);
    return NextResponse.json(
      { message: `Failed to update trainee: ${err.message}` },
      { status: 500 }
    );
  }
}

// Delete a trainee
export async function DELETE(request, context) {
  try {
    const { id } = await context.params; // 👈 Add await here
    
    // Delete trainee
    const deleteQuery = `DELETE FROM trainees WHERE id = ?`;
    await executeQuery({ query: deleteQuery, values: [id] });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete trainee:", error);
    return NextResponse.json(
      { error: "Failed to delete trainee" },
      { status: 500 }
    );
  }
}
