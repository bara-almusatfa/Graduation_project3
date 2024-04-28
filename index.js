const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const app = express();
app.use(cors());
const util = require('util');
const xml2js = require('xml2js');
const fs = require('fs');


// Promisify the exec function for easier use with async/await
const execAsync = util.promisify(exec);
const parseXmlAsync = util.promisify(xml2js.parseString);

app.use(express.json());



// Promisify exec function

app.get('/nmap/scan', async (req, res) => {
  const target = req.query.target;

  try {
    if (!target) {
      return res.status(400).json({ error: 'Target IP address is required.' });
    }

    // Run Nmap scan with additional options and capture XML output
    const command = `nmap -oX -  -T5 --max-rtt-timeout 1s --min-parallelism 100 ${target}`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      return res.status(500).json({ error: stderr });
    }

    // Parse the XML output
    const parsedResult = await parseXmlAsync(stdout);

    // Extract relevant information
    const hostInfo = parsedResult.nmaprun.host[0];
    const openPorts = hostInfo.ports[0].port.map((port) => ({
      number: port.$.portid,
      protocol: port.$.protocol,
      state: port.state[0].$.state,
      service: port.service[0].$.name,
      version: port.service[0].$.product,
    }));

    // Organize results into separate JSON properties
    const result = {
      hostInfo,
      openPorts,
    };

    // Return Nmap scan results as JSON
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});









app.get('/whois/scan/', (req, res) => {
  const url = req.query.url;

  if (!url) {
      res.status(400).json({ error: 'Please provide a URL as a query parameter.' });
      return;
  }

  runWhois(url)
      .then(result => {
          const formattedResult = parseWhoisResult(result);
          res.json(formattedResult);
      })
      .catch(error => {
          res.status(500).json({ error: 'Error running whois command: ' + error.message });
      });
});

function runWhois(url) {
  return new Promise((resolve, reject) => {
      exec(`whois ${url}`, (error, stdout, stderr) => {
          if (error) {
              reject(error);
              return;
          }
          if (stderr) {
              reject(new Error(stderr));
              return;
          }
          resolve(stdout);
      });
  });
}

function parseWhoisResult(result) {
  // Splitting result into lines
  const lines = result.split('\n');
  // Filtering out empty lines and comments
  const filteredLines = lines.filter(line => line.trim() !== '' && !line.startsWith('%'));

  // Creating an object to hold parsed information
  const parsedResult = {};

  // Parsing each line and adding it to the object
  filteredLines.forEach(line => {
      const [key, value] = line.split(':').map(part => part.trim());
      if (key && value) {
          parsedResult[key] = value;
      }
  });

  return parsedResult;
}




// Function to perform dirsearch

// Set up a 30-second timer to perform dirsearch

// Endpoint to set the target URL for dirsearch
app.get('/dirsearch/setTarget', (req, res) => {
  const newTargetUrl = req.query.url;

  if (!newTargetUrl) {
    return res.status(400).json({ error: 'Please provide a target URL in the "url" query parameter.' });
  }

  
  let dirsearchResult = null;

  

    const dirsearchCommand = `dirsearch -u ${newTargetUrl} --format=json -o json`;

    exec(dirsearchCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Command execution stderr: ${stderr}`);
        return;
      }

      console.log(`dirsearch command executed successfully. Output:\n${stdout}`);

      try {
        dirsearchResult = JSON.parse(stdout);
        // You can do something with the result here if needed
      } catch (parseError) {
        console.error(`Error parsing dirsearch output as JSON: ${parseError.message}`);
      }

      // Stop the timer after one execution
      clearInterval(timer);
    });
  ;

  res.json({ message: `Target URL set to: ${newTargetUrl}` });
});


// Endpoint to get the raw results of the "cat json" command
app.get('/dirsearch/getRawResults', (req, res) => {
  const catCommand = 'cat json';

  exec(catCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (stderr) {
      console.error(`Command execution stderr: ${stderr}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    console.log(`Command executed successfully. Output:\n${stdout}`);

    try {
      const formattedJson = stdout.trim(); // Remove leading/trailing whitespace
      const parsedJson = JSON.parse(formattedJson);

      res.json({ result: parsedJson });
    } catch (parseError) {
      console.error(`Error parsing or formatting JSON: ${parseError.message}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

app.get("/", (req, res) => {
  res.redirect("/nmap/scan");
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log("Server started on port 3001");
});
