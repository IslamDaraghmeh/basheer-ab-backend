import DepartmentModel from "../../../../DB/models/Department.model.js";
import mongoose from 'mongoose';


const dropUniqueIndex = async () => {
    try {
        await mongoose.connection.db.collection('departments').dropIndex("headOfEmployee.email_1");
        console.log("Dropped index: headOfEmployee.email");
    } catch (error) {
        if (error.codeName !== "IndexNotFound") {
            console.error("Error dropping index:", error);
        }
    }
};

const dropUniqueIndexEmployee = async () => {
    try {
        await mongoose.connection.db.collection('departments').dropIndex("employees.email_1");
        console.log("Dropped index: employees.email");
    } catch (error) {
        if (error.codeName !== "IndexNotFound") {
            console.error("Error dropping index:", error);
        }
    }
};


export const AddDepartment = async (req, res, next) => {
    const { name, permissions, description } = req.body;
    try {
        await dropUniqueIndex();
        await dropUniqueIndexEmployee();

        const addDepartment = await DepartmentModel.create({
            name,
            permissions,
            description,
        });

        if (!addDepartment) {
            return res.status(400).json({ message: "Error in adding department" });
        }

        return res.status(200).json({
            message: "Department added successfully",
            department: addDepartment,
        });
    } catch (error) {
        next(error);
    }
};


export const deleteDepartment = async (req, res, next) => {
    const { id } = req.params;
    try {
        const department = await DepartmentModel.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        await DepartmentModel.findByIdAndDelete(id);
        return res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        next(error);
    }
};


export const allDepartment = async (req, res, next) => {
    try {
        const departments = await DepartmentModel.find({});
        if (!departments || departments.length === 0) {
            return res.status(404).json({ message: "No departments found" });
        }

        return res.status(200).json({ message: "All departments", departments });
    } catch (error) {
        next(error);
    }
};


export const depById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const department = await DepartmentModel.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        return res.status(200).json({ message: "Requested department", department });
    } catch (error) {
        next(error);
    }
};


export const updateDep = async (req, res, next) => {
    const { name, description } = req.body;
    const { id } = req.params;
    try {
        const department = await DepartmentModel.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        department.name = name || department.name;
        department.description = description || department.description;
        await department.save();

        res.status(200).json({ message: "Department updated successfully", department });
    } catch (error) {
        next(error);
    }
};
