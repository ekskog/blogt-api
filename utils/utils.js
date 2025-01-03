const path = require('path');
const fs = require('fs').promises;
const postsDir = path.join(__dirname, '..', 'posts');

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
                    if (!day.endsWith('.md')) {
                        continue;
                    }

                    const postPath = path.join(year, month, day);
                    const dateParts = postPath.split('/');
                    const postDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2].replace('.md', '')}`);

                    if (!latestPostDate || postDate > latestPostDate) {
                        latestPostDate = postDate;
                        latestPostPath = postPath;
                    }
                }
            }
        }

        return { latestPostPath, latestPostDate };
    } catch (error) {
        throw new Error('Could not retrieve post files');
    }
}

async function getNext(dateString) {

    const year = parseInt(dateString.slice(0, 4));
    const month = parseInt(dateString.slice(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(dateString.slice(6));
    let date = new Date(year, month, day);

    let iterations = 0;
    while (iterations < 365) {
        iterations++;
        date.setDate(date.getDate() + 1);
        const nextYear = date.getFullYear().toString();
        const nextMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const nextDay = date.getDate().toString().padStart(2, '0');
        const filePath = path.join(postsDir, nextYear, nextMonth, `${nextDay}.md`);

        try {
            await fs.access(filePath);
            return `${nextYear}${nextMonth}${nextDay}`;
        } catch (error) {
            // Log the missing entry
            // debug(`No entry found for ${nextYear}-${nextMonth}-${nextDay}. Checking next date...`);
            // Continue to next date
        }
    }
}

async function getPrev(dateString) {
    const year = parseInt(dateString.slice(0, 4));
    const month = parseInt(dateString.slice(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(dateString.slice(6));
    let date = new Date(year, month, day);

    let iterations = 0;
    while (iterations < 365) {
        iterations++; date.setDate(date.getDate() - 1);
        const prevYear = date.getFullYear().toString();
        const prevMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const prevDay = date.getDate().toString().padStart(2, '0');
        const filePath = path.join(postsDir, prevYear, prevMonth, `${prevDay}.md`);

        try {
            await fs.access(filePath);
            return `${prevYear}${prevMonth}${prevDay}`;
        } catch (error) {
            // Log the missing entry
            // console.err(`No entry found for ${prevYear}-${prevMonth}-${prevDay}. Checking previous date...`);
            // Continue to previous date
        }
    }
}

const formatDate = async (dateString) => {
    const date = new Date(dateString);

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');

    let formatted = `${year}${month}${day}`;
    return formatted;
}


module.exports = {
    findLatestPost,
    getNext,
    getPrev,
    formatDate
};