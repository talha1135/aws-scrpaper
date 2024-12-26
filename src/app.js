const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelService = require('./services/excelService');
const scrapeASINs = require('./controllers/scrapeController');
const logger = require('./utils/logger');
const { successResponse, errorResponse } = require('./utils/responses');
const { validateFileUpload } = require('./validators/uploadValidator');

const app = express();
const port = 3000;

// Set up file upload with Multer (limit file size to 10MB and accept only .xlsx)
const upload = multer({
    dest: './uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /xlsx$/; // Accept only .xlsx files
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            cb(null, true);
        } else {
            cb(new Error('Only .xlsx files are allowed!'));
        }
    }
});

// Serve static files
app.use(express.static('public'));
app.use('/files', express.static(path.join(__dirname, 'files')));

// POST route for file upload
app.post('/api/upload', upload.single('file'), validateFileUpload, async (req, res) => {
    if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
    }

    const { filename, originalname, path: tempPath } = req.file;

    try {
        // Read the uploaded file buffer and process it
        const fileBuffer = fs.readFileSync(tempPath);
        const { data } = ExcelService.processAndSaveExcel(fileBuffer, originalname);

        // Scrape ASINs based on the processed Excel data
        const updatedData = await scrapeASINs(data);


        // Return the link to the processed file
        res.json({
            success: true,
            data: {
                downloadLink: updatedData
            }
        });
    } catch (err) {
        logger.error(`Error uploading file: ${err.message}`);
        return errorResponse(res, 'Error processing file');
    } finally {
        // Clean up temporary file
        fs.unlink(tempPath, (err) => {
            if (err) logger.error(`Error deleting temporary file: ${err.message}`);
        });
    }
});

app.get('/api/download/:fileName', (req, res) => {
    const { fileName } = req.params;
  
    // Define the directory where the files are stored
    const fileDirectory = path.join(__dirname, '../files'); // Assuming files are stored in an 'uploads' directory
    // Resolve the full path of the requested file
    const filePath = path.join(fileDirectory, fileName);
  
    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // If the file doesn't exist, send an error response
        return res.status(404).json({ message: 'File not found' });
      }
  
      // Set the headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  
      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    });
  });

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
