// Wait for Vite dev server to be ready
import http from 'http';

const url = 'http://localhost:5173';
const maxAttempts = 30;
const delay = 500;

async function checkServer(attempt = 1) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      resolve(true);
    }).on('error', () => {
      if (attempt >= maxAttempts) {
        reject(new Error('Vite server did not start in time'));
      } else {
        setTimeout(() => {
          checkServer(attempt + 1).then(resolve).catch(reject);
        }, delay);
      }
    });
  });
}

checkServer()
  .then(() => {
    console.log('Vite server is ready!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
