import DepartmentModel from "../../DB/models/Department.model.js";

export const checkDepartmentPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = req.user; 

      if (!user || !user.role) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      
      if (user.role === "Admin") return next();

   
      const department = await DepartmentModel.findById(user.departmentId);
      if (!department) {
        return res.status(403).json({ message: "Department not found" });
      }

      if (department.permissions.includes(requiredPermission)) {
        return next();
      } else {
        return res.status(403).json({ message: "Permission denied" });
      }
    } catch (err) {
      return res.status(500).json({ message: "Internal error", error: err.message });
    }
  };
};
