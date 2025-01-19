const debug = require("debug")("blogt-api:utils");

const { get } = require("http");
const path = require("path");
const { ByteLengthQueuingStrategy } = require("stream/web");
const fs = require("fs").promises;
const postsDir = path.join(__dirname, "..", "posts");

const findLatestPost = async () => {
  let latestPostDate = null;
  let latestPostPath = null;

  try {
    const years = await fs.readdir(postsDir);
    for (const year of years) {
      // Only proceed if it's a directory
      const yearPath = path.join(postsDir, year);
      if (!(await fs.stat(yearPath)).isDirectory()) {
        continue;
      }

      const monthsDir = path.join(postsDir, year);
      const months = await fs.readdir(monthsDir);

      for (const month of months) {
        // Only proceed if it's a directory
        const monthPath = path.join(monthsDir, month);
        if (!(await fs.stat(monthPath)).isDirectory()) {
          continue;
        }

        const daysDir = path.join(monthsDir, month);
        const days = await fs.readdir(daysDir);

        for (const day of days) {
          const dayRegex = /^(0[1-9]|[12][0-9]|3[01])\.md$/;

          if (!dayRegex.test(day)) {
            continue;
          }
          // Only process markdown files
          if (!day.endsWith(".md")) {
            continue;
          }

          const postPath = path.join(year, month, day);
          const dateParts = postPath.split("/");
          const postDate = new Date(
            `${dateParts[0]}-${dateParts[1]}-${dateParts[2].replace(".md", "")}`
          );

          if (!latestPostDate || postDate > latestPostDate) {
            latestPostDate = postDate;
            latestPostPath = postPath;
          }
        }
      }
    }

    return { latestPostPath, latestPostDate };
  } catch (error) {
    throw new Error("Could not retrieve post files");
  }
};

async function extractFromDate(dateString) {
  // Extract day, month, and year from the string
  const day = parseInt(dateString.substring(0, 2), 10);
  const month = parseInt(dateString.substring(2, 4), 10) - 1; // Months are 0-based in JavaScript
  const year = parseInt(dateString.substring(4, 8), 10);

  return new Date(year, month, day);
}

async function getNext(dateString) {
  let date = await extractFromDate(dateString);

  let iterations = 0;
  while (iterations < 365) {
    iterations++;
    date.setDate(date.getDate() + 1);
    const nextYear = date.getFullYear().toString();
    const nextMonth = (date.getMonth() + 1).toString().padStart(2, "0");
    const nextDay = date.getDate().toString().padStart(2, "0");
    const filePath = path.join(postsDir, nextYear, nextMonth, `${nextDay}.md`);

    try {
      await fs.access(filePath);
      return `${nextYear}${nextMonth}${nextDay}`;
    } catch (error) {
      // Log the missing entry
      debug(`No entry found for ${nextYear}-${nextMonth}-${nextDay}. Checking next date...`);
      // Continue to next date
    }
  }
}

async function getPrev(dateString) {
  let date = await extractFromDate(dateString);
  let iterations = 0;
  while (iterations < 365) {
    iterations++;
    date.setDate(date.getDate() - 1);
    // Format the date back to DDMMYYYY
    const previousDay = String(date.getDate()).padStart(2, "0");
    const previousMonth = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
    const previousYear = date.getFullYear().toString();
    const filePath = path.join(
      postsDir,
      previousYear,
      previousMonth,
      `${previousDay}.md`
    );

    try {
      await fs.access(filePath);
      return `${previousDay}${previousMonth}${previousYear}`;
    } catch (error) {
      // Log the missing entry
      debug(`No entry found for ${prevYear}-${prevMonth}-${prevDay}. Checking previous date...`);
      // Continue to previous date
    }
  }
}

const formatDate = async (dateString) => {
  const date = new Date(dateString);

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");

  let formatted = `${day}${month}${year}`;
  return formatted;
};

const formatDates = async (inputDate) => {
  // Ensure input is in DDMMYYYY format
  const day = inputDate.substring(0, 2);
  const month = inputDate.substring(2, 4);
  const year = inputDate.substring(4, 8);

  // Create the formatted string 'YYYY/MM/DD.md'
  const latestPostPath = `${year}/${month}/${day}.md`;

  // Create the full ISO date string "YYYY-MM-DDT00:00:00.000Z"
  const latestPostDate = new Date(
    `${year}-${month}-${day}T00:00:00.000Z`
  ).toISOString();

  return { latestPostDate, latestPostPath };
};

const getPostsArray = async (dateString) => {
  try {
    const postsArray = [];
    const postsPerPage = 10; // Number of posts per page

    // Loop to get the posts for the requested page
    for (let i = 0; i < postsPerPage; i++) {
      const day = dateString.slice(0, 2);
      const month = dateString.slice(2, 4);
      const year = dateString.slice(4, 8);
      let filePath = path.join(postsDir, year, month, `${day}.md`);
      console.log("File path:", filePath);

      try {
        const data = await fs.readFile(filePath, "utf-8");
        postsArray.push(data);
        dateString = await getPrev(dateString);
        if (!dateString) {
          break;
        } else {
          debug("Posts to display" + postsArray.length);
        }
      } catch (err) {
        console.log(err);
        console.error(`No post found for ${year}-${month}-${day}`);
        dateString = await getPrev(dateString);
        // Continue to next date if file does not exist
      }
    }
    return postsArray;
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  findLatestPost,
  getNext,
  getPrev,
  getPostsArray,
  formatDate,
  formatDates,
};
