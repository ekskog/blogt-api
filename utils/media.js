const sharp = require("sharp");
const Minio = require("minio");
require("dotenv").config();
const debug = require("debug")("blogt-api:media-utils");

const minioParams = {
  endPoint: process.env.MINIO_ENDPOINT || "objects.ekskog.xyz",
  port: Number(process.env.MINIO_PORT) || 443,
  useSSL: process.env.MINIO_USE_SSL
    ? process.env.MINIO_USE_SSL === "true"
    : true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
};

const minioClient = new Minio.Client(minioParams);

console.log(minioParams);
async function uploadImageBuffer(fileBuffer, bucketName, objectName) {
  try {
    const resizedImageBuffer = await sharp(fileBuffer)
      .resize(1920, 1920, { fit: "inside" })
      .withMetadata()
      .toBuffer();

    console.log(
      `Uploading image to bucket=${bucketName}, object=${objectName}, size=${resizedImageBuffer.length}`
    );

    await minioClient.putObject(bucketName, objectName, resizedImageBuffer);

    return `File uploaded successfully to ${bucketName}/${objectName}.`;
  } catch (err) {
    debug("Error uploading image to MinIO:", err);
    throw err;
  }
}

module.exports = {
  uploadImageBuffer,
};


