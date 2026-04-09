import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { put, get, list } from '@vercel/blob';
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
  const avatar = req.files.avatar;
  if (avatar) {
    //avatar file
    console.log(avatar.fieldName);
    console.log(avatar.type);
    console.log(avatar.size);
    console.log(avatar.originalFilename);
    console.log(avatar.path);
    try {
      const ext = mimeToExt(avatar.type); // .png .jpg .gif .webp
      const newName = `${crypto.randomUUID()}${ext}`;
      //you can add prefixes like folder names in this name too

      //the next two lines FAIL because Vercel is read-only file system
      //const dest = `${process.cwd()}/uploads/${newName}`;
      //await copyFile(avatar.path, dest);

      // using vercel/blob put method to save a file on Vercel
      const fileBuffer = await readFile(avatar.path);
      const blob = await put(newName, fileBuffer, {
        access: 'public',
        contentType: avatar.type,
      });

      console.log(`${avatar.path} was uploaded vercel/blob`);
      res.status(201).send('Thanks for the image');
    } catch (err) {
      console.log(`File could not be copied. ${err.message}`);
      res.status(500).send('Failed to save your garbage image');
    }
  } else {
    //no avatar file
    res.status(418).send('No avatar uploaded');
  }
});

/* get list of files */
app.get('/api/images', async (req, res) => {
  //send back a JSON array with a list of filenames from NodeJS and local folder
  // const dir = `${process.cwd()}/uploads`;
  // const entries = await readdir(dir, { withFileTypes: true });
  // const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  //filter out directories and then just return the file names, not file objects
  // res.json({ images: files });

  // using vercel/blob
  try {
    const { blobs } = await list({ limit: 100 });
    // { prefix: 'avatars/'} if you add a prefix folder name when uploading
    const images = blobs.map((blob) => ({
      name: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
    res.json({ images });
  } catch (err) {
    console.error('Failed to list blobs:', err.message);
    res.status(500).json({ error: 'Failed to retrieve images' });
  }
});

/* download A file */
app.get('/api/images/:filename', async (req, res) => {
  //download the actual image with NodeJS
  // const file = req.params.filename;
  // const filepath = join(process.cwd(), 'uploads', file);
  // console.log('DOWNLOADING', filepath);
  // // res.attachment(file);
  // //set the content-disposition header with the filename
  // //telling the browser to prompt for saving instead of displaying
  // res.download(filepath, file, (err) => {
  //   //callback when completed
  //   //path is the real local location of the file to send
  //   //file is the name or fake name for the file to tell the browser
  //   if (!res.headersSent) {
  //     //if the headers have not been sent yet
  //     res.status(404).send('Nope');
  //   }
  // });

  // use vercel/blob get method
  try {
    const { blobs } = await list({ prefix: `${req.params.filename}` });
    //if there is a prefix/foldername add it above
    if (blobs.length === 0) {
      return res.status(404).send('Image not found');
    }
    res.redirect(blobs[0].url);
  } catch (err) {
    console.error('Download failed:', err.message);
    res.status(500).send('Failed to retrieve image');
  }
  //if we want to change headers etc then we can build a new response obj
  //and send a response.arrayBuffer()
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
