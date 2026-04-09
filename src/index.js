import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { put, get } from '@vercel/blob';
import formData from 'express-form-data';
import os from 'node:os';
//Node OS to access the file system temp dir
import { copyFile, constants, readdir } from 'node:fs/promises';
//Node fs object lets us move, copy, save, delete files
import { join } from 'node:path';
//build a path from a list of strings
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// for file uploads
const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};
app.use(formData.parse(options));

// delete from the request all empty files (size == 0)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(process.cwd());
// current project folder where the Node command was run

/* Health check route */
app.get('/', (req, res) => {
  res.send('API is up and running');
});

/* deal with uploaded files */
app.post('/api/images', async (req, res) => {
  // using basic Node when we can write to the filesystem
  const dir = `${process.cwd()}/uploads`;
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  //filter out directories and then just return the file names, not file objects
  res.json({ images: files });

  // using vercel/blob put method to save a file on Vercel
});

/* get list of files */
app.get('/api/images', async (req, res) => {
  //send back a JSON array with a list of filenames from NodeJS and local folder
  const dir = `${process.cwd()}/uploads`;
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  //filter out directories and then just return the file names, not file objects
  res.json({ images: files });

  // using vercel/blob
});

/* download A file */
app.get('/api/images/:filename', async (req, res) => {
  //download the actual image with NodeJS
  const file = req.params.filename;
  const filepath = join(process.cwd(), 'uploads', file);
  console.log('DOWNLOADING', filepath);
  // res.attachment(file);
  //set the content-disposition header with the filename
  //telling the browser to prompt for saving instead of displaying
  res.download(filepath, file, (err) => {
    //callback when completed
    //path is the real local location of the file to send
    //file is the name or fake name for the file to tell the browser
    if (!res.headersSent) {
      //if the headers have not been sent yet
      res.status(404).send('Nope');
    }
  });

  // use vercel/blob get method
});

/* 404 route handling */
app.use((req, res) => {
  res.status(404).send('Nobody here but us chickens');
});
const PORT = process.env.PORT ?? 4000;
app.listen(PORT, (err) => {
  if (err) {
    console.log(`Failed to launch: ${err.message}`);
    return;
  }
  console.log(`API listening on port ${PORT}`);
});

function mimeToExt(mime) {
  mime = mime.toLowerCase();
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/gif':
      return '.gif';
    case 'image/svg':
      return '.svg';
    case 'image/avif':
      return '.avif';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}
