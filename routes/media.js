const express = require("express");
const router = express.Router();

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { uploadImageBuffer } = require("../utils/media");

// POST /media/images - upload an image and return its URL
router.post("/images", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { date } = req.body; // expected YYYY-MM-DD from editor

    console.log(date);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "date is required and must be in YYYY-MM-DD format" });
    }

    const [year, month, day] = date.split("-");

    const bucketName = process.env.MINIO_BUCKET || "blotpix";
    const folderPath = `${year}/${month}`;
    const fileName = `${day}.jpeg`;
    const objectName = `${folderPath}/${fileName}`;

    await uploadImageBuffer(file.buffer, bucketName, objectName);

    const publicBase =
      process.env.MINIO_PUBLIC_BASE ||
      "https://objects.hbvu.su/blotpix"; // keep existing convention
    const url = `${publicBase}/${folderPath}/${fileName}`;

    res.status(201).json({ url });
  } catch (error) {
    console.error("Error handling image upload:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;


