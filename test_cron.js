const { runDailyAttendanceJob } = require('./cron_attendance');

(async () => {
    console.log("Testing Cron Job...");
    await runDailyAttendanceJob();
    console.log("Test finished. Exiting...");
    process.exit(0);
})();
