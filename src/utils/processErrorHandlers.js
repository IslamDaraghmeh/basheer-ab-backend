const setupProcessErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    console.error('Stack:', error.stack);

    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);

    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
};

export default setupProcessErrorHandlers;