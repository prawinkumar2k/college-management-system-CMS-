import db from '../db.js';

// Get payroll data
export const getPayrollData = async (req, res) => {
    try {
        const { month, year, staffId, department } = req.query;

        let query = `
            SELECT p.*, sm.Staff_Name, sm.Dept_Name, sm.Designation
            FROM hr_payroll p
            LEFT JOIN staff_master sm ON p.staff_id = sm.Staff_ID
            WHERE 1=1
        `;
        const params = [];

        if (month && year) {
            query += ' AND p.month = ? AND p.year = ?';
            params.push(month, year);
        }

        if (staffId) {
            query += ' AND p.staff_id = ?';
            params.push(staffId);
        }

        if (department) {
            query += ' AND sm.Dept_Name = ?';
            params.push(department);
        }

        query += ' ORDER BY p.year DESC, p.month DESC, sm.Staff_Name';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching payroll data:', error);
        res.status(500).json({ error: 'Failed to fetch payroll data' });
    }
};

// Generate payslips
export const generatePayslips = async (req, res) => {
    try {
        const { month, year, staffIds } = req.body;

        // Fetch staff details
        let staffQuery = 'SELECT * FROM staff_master WHERE 1=1';
        const params = [];

        if (staffIds && staffIds.length > 0) {
            staffQuery += ' AND Staff_ID IN (?)';
            params.push(staffIds);
        }

        staffQuery += ' AND (Reliving_Date IS NULL OR Reliving_Date = \'\')';

        const [staffList] = await db.query(staffQuery, params);

        const payslips = [];
        for (const staff of staffList) {
            // Get salary structure
            const [salaryData] = await db.query(
                'SELECT * FROM hr_staff_salary WHERE staff_id = ?',
                [staff.Staff_ID]
            );

            const salary = salaryData[0] || {};

            // Calculate earnings and deductions
            const basicSalary = parseFloat(salary.basic_salary || 0);
            const hra = parseFloat(salary.hra || 0);
            const da = parseFloat(salary.da || 0);
            const ta = parseFloat(salary.ta || 0);
            const specialAllowance = parseFloat(salary.special_allowance || 0);

            const grossSalary = basicSalary + hra + da + ta + specialAllowance;

            const pf = parseFloat(salary.pf_deduction || 0);
            const esi = parseFloat(salary.esi_deduction || 0);
            const professionalTax = parseFloat(salary.professional_tax || 0);
            const tds = parseFloat(salary.tds || 0);

            const totalDeductions = pf + esi + professionalTax + tds;
            const netSalary = grossSalary - totalDeductions;

            payslips.push({
                staff_id: staff.Staff_ID,
                month: month,
                year: year,
                basic_salary: basicSalary,
                hra: hra,
                da: da,
                ta: ta,
                special_allowance: specialAllowance,
                gross_salary: grossSalary,
                pf_deduction: pf,
                esi_deduction: esi,
                professional_tax: professionalTax,
                tds: tds,
                total_deductions: totalDeductions,
                net_salary: netSalary,
                status: 'generated'
            });
        }

        // Insert payslips
        if (payslips.length > 0) {
            const values = payslips.map(p => [
                p.staff_id, p.month, p.year, p.basic_salary, p.hra, p.da, p.ta,
                p.special_allowance, p.gross_salary, p.pf_deduction, p.esi_deduction,
                p.professional_tax, p.tds, p.total_deductions, p.net_salary, p.status
            ]);

            const query = `
                INSERT INTO hr_payroll 
                (staff_id, month, year, basic_salary, hra, da, ta, special_allowance, 
                 gross_salary, pf_deduction, esi_deduction, professional_tax, tds, 
                 total_deductions, net_salary, status)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                    basic_salary = VALUES(basic_salary),
                    hra = VALUES(hra),
                    da = VALUES(da),
                    ta = VALUES(ta),
                    special_allowance = VALUES(special_allowance),
                    gross_salary = VALUES(gross_salary),
                    pf_deduction = VALUES(pf_deduction),
                    esi_deduction = VALUES(esi_deduction),
                    professional_tax = VALUES(professional_tax),
                    tds = VALUES(tds),
                    total_deductions = VALUES(total_deductions),
                    net_salary = VALUES(net_salary)
            `;

            await db.query(query, [values]);
        }

        res.status(201).json({
            message: 'Payslips generated successfully',
            count: payslips.length
        });
    } catch (error) {
        console.error('Error generating payslips:', error);
        res.status(500).json({ error: 'Failed to generate payslips' });
    }
};

// Process monthly payroll
export const processMonthlyPayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        const query = `
            UPDATE hr_payroll 
            SET status = 'paid', 
                paid_date = CURDATE()
            WHERE month = ? AND year = ? AND status = 'generated'
        `;

        const [result] = await db.query(query, [month, year]);

        res.json({
            message: 'Monthly payroll processed successfully',
            recordsUpdated: result.affectedRows
        });
    } catch (error) {
        console.error('Error processing payroll:', error);
        res.status(500).json({ error: 'Failed to process payroll' });
    }
};

// Get payroll reports
export const getPayrollReports = async (req, res) => {
    try {
        const { month, year, reportType } = req.query;

        let query = '';
        const params = [];

        if (reportType === 'summary') {
            query = `
                SELECT 
                    COUNT(DISTINCT p.staff_id) as total_employees,
                    SUM(p.gross_salary) as total_gross,
                    SUM(p.total_deductions) as total_deductions,
                    SUM(p.net_salary) as total_net,
                    COUNT(CASE WHEN p.status = 'paid' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN p.status = 'generated' THEN 1 END) as pending_count
                FROM hr_payroll p
                WHERE p.month = ? AND p.year = ?
            `;
            params.push(month, year);
        } else if (reportType === 'department') {
            query = `
                SELECT 
                    sm.Dept_Name,
                    COUNT(p.staff_id) as employee_count,
                    SUM(p.gross_salary) as total_gross,
                    SUM(p.net_salary) as total_net
                FROM hr_payroll p
                LEFT JOIN staff_master sm ON p.staff_id = sm.Staff_ID
                WHERE p.month = ? AND p.year = ?
                GROUP BY sm.Dept_Name
            `;
            params.push(month, year);
        } else {
            query = `
                SELECT p.*, sm.Staff_Name, sm.Dept_Name, sm.Designation
                FROM hr_payroll p
                LEFT JOIN staff_master sm ON p.staff_id = sm.Staff_ID
                WHERE p.month = ? AND p.year = ?
                ORDER BY sm.Staff_Name
            `;
            params.push(month, year);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching payroll reports:', error);
        res.status(500).json({ error: 'Failed to fetch payroll reports' });
    }
};

// Get salary structure
export const getSalaryStructure = async (req, res) => {
    try {
        const { staffId } = req.query;

        let query = `
            SELECT ss.*, sm.Staff_Name, sm.Dept_Name, sm.Designation
            FROM hr_staff_salary ss
            LEFT JOIN staff_master sm ON ss.staff_id = sm.Staff_ID
            WHERE 1=1
        `;
        const params = [];

        if (staffId) {
            query += ' AND ss.staff_id = ?';
            params.push(staffId);
        }

        query += ' ORDER BY sm.Staff_Name';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching salary structure:', error);
        res.status(500).json({ error: 'Failed to fetch salary structure' });
    }
};

// Update salary structure
export const updateSalaryStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const salaryData = req.body;

        const fields = Object.keys(salaryData)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(salaryData), id];

        const query = `UPDATE hr_staff_salary SET ${fields} WHERE id = ?`;
        await db.query(query, values);

        res.json({ message: 'Salary structure updated successfully' });
    } catch (error) {
        console.error('Error updating salary structure:', error);
        res.status(500).json({ error: 'Failed to update salary structure' });
    }
};
