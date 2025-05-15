const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const express = require('express');
const multer = require('multer');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

program
  .requiredOption('-H, --host <host>', 'Server address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cache>', 'Path to cache directory')
  .parse(process.argv);

const options = program.opts();

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
}

const app = express();

// middleware
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

const upload = multer();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes API',
      version: '1.0.0',
    },
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const getNotePath = (noteName) => path.join(options.cache, `${noteName}.txt`);

const getNotesList = () => {
  const files = fs.readdirSync(options.cache);
  return files
    .filter(file => file.endsWith('.txt'))
    .map(file => {
      const name = path.basename(file, '.txt');
      try {
        const text = fs.readFileSync(path.join(options.cache, file), 'utf8');
        return { name, text };
      } catch (err) {
        return { name, text: '' };
      }
    });
};

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Get a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note
 *     responses:
 *       200:
 *         description: The note content
 *       404:
 *         description: Note not found
 */
app.get('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);
  
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  
  const noteContent = fs.readFileSync(notePath, 'utf8');
  res.send(noteContent);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Update a note
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       404:
 *         description: Note not found
 */
app.put('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);
  
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  
  fs.writeFileSync(notePath, req.body);
  res.status(200).send('Note updated successfully');
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Delete a note
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
app.delete('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);
  
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  
  fs.unlinkSync(notePath);
  res.status(200).send('Note deleted successfully');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Get all notes
 *     responses:
 *       200:
 *         description: A list of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get('/notes', (req, res) => {
  const notes = getNotesList();
  res.status(200).json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Create a new note
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: note_name
 *         type: string
 *         required: true
 *         description: Name of the note
 *       - in: formData
 *         name: note
 *         type: string
 *         required: true
 *         description: Content of the note
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Note already exists
 */
app.post('/write', upload.none(), (req, res) => {
  const noteName = req.body.note_name;
  const noteContent = req.body.note;
  const notePath = getNotePath(noteName);
  
  if (fs.existsSync(notePath)) {
    return res.status(400).send('Note already exists');
  }
  
  fs.writeFileSync(notePath, noteContent);
  res.status(201).send('Note created successfully');
});

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Get the HTML form for uploading notes
 *     responses:
 *       200:
 *         description: HTML form
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

app.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
  console.log(`API documentation available at http://${options.host}:${options.port}/docs`);
}); 