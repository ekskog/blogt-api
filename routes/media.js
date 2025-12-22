const express = require("express");
const router = express.Router();

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { uploadImageBuffer } = require("../utils/media");

// POST /media/images - upload an image and return its URL
router.post("/images", upload.single("file"), async (req, res) => {
  try {
    console.time("Handling image upload");
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { date } = req.body;
    const day = date.substring(0, 2); // "15"
    const month = date.substring(2, 4); // "03"
    const year = date.substring(4, 8);

    const bucketName = process.env.MINIO_BUCKET || "blotpix";
    const folderPath = `${year}/${month}`;
    const fileName = `${day}.jpeg`;
    const objectName = `${folderPath}/${fileName}`;

    await uploadImageBuffer(file.buffer, bucketName, objectName);

    const publicBase =
      process.env.MINIO_PUBLIC_BASE || "https://objects.hbvu.su/blotpix"; // keep existing convention
    const url = `${publicBase}/${folderPath}/${fileName}`;
    console.time("Handling image upload");

    res.status(201).json({ url });
  } catch (error) {
    console.error("Error handling image upload:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;
