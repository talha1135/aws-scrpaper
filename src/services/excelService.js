const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelService {
    static processAndSaveExcel(fileBuffer, originalFileName) {
        // Save the file with the correct extension
        const { fileName, uploadPath } = this.saveFileWithSameExtension(fileBuffer, originalFileName);

        // Read and process the saved file
        const processedData = this.readExcel(fileName);

        // Return both the saved file details and the processed data
        return { savedFile: { fileName, uploadPath }, ...processedData };
    }

    static saveFileWithSameExtension(fileBuffer, originalFileName) {
        const fileExtension = path.extname(originalFileName); // Get file extension
        const newFileName = `${Date.now()}${fileExtension}`; // Generate a unique file name
        const uploadPath = path.resolve(__dirname, '../../uploads', newFileName);

        try {
            fs.writeFileSync(uploadPath, fileBuffer); // Save the file buffer to the specified path
            return { fileName: newFileName, uploadPath }; // Return the new file name and path
        } catch (error) {
            throw new Error(`Error saving the file: ${error.message}`);
        }
    }

    static readExcel(fileName) {
        const filePath = path.resolve(__dirname, '../../uploads', fileName);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileName}`);
        }

        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0]; // Get the first sheet name
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON
            return { data, workbook, sheetName };
        } catch (error) {
            throw new Error(`Error reading the Excel file: ${error.message}`);
        }
    }
}

module.exports = ExcelService;
