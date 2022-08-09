import https from 'https'

export default function getIsgd(url: string, text?: string): Promise<string> {
  const getStr =
    `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}` +
    (text ? `&shorturl=${encodeURIComponent(text)}` : '')
  return new Promise((resolve, reject) => {
    https.get(getStr, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve(body))
      res.on('error', reject)
    })
  })
}

/*


    lookup: function(url, cb) {
        https.get('https://is.gd/forward.php?format=simple&shorturl=' + encodeURIComponent(url), function (res) {
            var body = '';
            res.on('data', function(chunk) { body += chunk; });
            res.on('end', function() { cb(body); });
        });
    }

*/
