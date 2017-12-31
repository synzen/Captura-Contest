function send(url, data, callback, overrides) {
  const settings = {
    url: url,
    type: "POST",
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    success: function(data) {
      if (typeof callback === 'function') callback(data)
    },
    error: function(e, text) {
      if (typeof callback === 'function') callback(null, text)
      console.log(`process error for url ${url}`, e);
    }
  }
  if (overrides) for (var x in overrides) settings[x] = overrides[x]
  $.ajax(settings)
 }
