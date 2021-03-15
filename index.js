const BootBot = require('bootbot');
const config = require('config');
const fetch = require('node-fetch');
var emoji = require('node-emoji');

// yarn startTunnel
// yarn startDev
var port = process.env.PORT || config.get('PORT');

const bot = new BootBot({
  accessToken: config.get('ACCESS_TOKEN'),
  verifyToken: config.get('VERIFY_TOKEN'),
  appSecret: config.get('APP_SECRET')
});

// variable
var currency = 'usd';
var watchedPercentP = 3;
var watchedPercentM = -3;
var dogTimer = 10000;
var watchDogP = 5;
var userId, watchDogC, dogTimeInt;


bot.setGreetingText('Hey there! Welcome to Cryptocheck!');

bot.setGetStartedButton((payload, chat) => {
  propMenu(chat, true);
  userId = payload.sender.id;
  console.log(userId)
});

// payload = obsah chatu; chat == konkretni chat
bot.on('message', (payload, chat) => {
  const text = payload.message.text;
  console.log(`The user said: ${text}`);
});


bot.on('postback:SET_CURRENCY', (payload, chat) => {
  chat.say(`The current currency is "${currency}"`);
  chat.say('Pls write "setcur" and then your wanted currency for example( czk, usd, eur, btc, eth, etc.) ');
});


bot.on('postback:SET_PPERCENT', (payload, chat) => {
  chat.say(`The current percentage is "${watchedPercentP}" %`);
  chat.say('Pls write "setpper" and then your wanted precentage for example(setpper1, setpper 3, etc. ) ');
});

bot.on('postback:SET_MPERCENT', (payload, chat) => {
  chat.say(`The current percentage is "${watchedPercentM}" %`);
  chat.say('Pls write "setmper" and then your wanted precentage for example(setmper -1,setmper -3, etc. ) ');
});

bot.on('postback:Q_CHECK', (payload, chat) => {
  chat.say('Pls type "qcheck + the cryptocurrency that you want to check.\nExample: coin bitcoin, coin cardano, etc...')
})

bot.on('postback:PRICE_CHECK', (payload, chat) => {
  propPriceCheck(chat);
})

bot.on('postback:PC_CHECK', (payload, chat) => {
  propPcCheck(chat)
})

bot.on('postback:TOP_WINNERS', (payload, chat) => {
  checkPriceChange(currency, watchedPercentP, watchedPercentM).then(result => {
    if(result[0] == null){
      chat.say(`There is no coin that has more then ${watchedPercentP}% change.`);
    } else {
      chat.say(result[0]);
    }
    
  });
})

bot.on('postback:TOP_LOSERS', (payload, chat) => {
  checkPriceChange(currency, watchedPercentP, watchedPercentM).then(result => {
  
    if(result[1] == null){
      chat.say(`There is no coin that has less then ${watchedPercentM}% change.`);
    } else {
      chat.say(result[1]);
    }
  });
})

bot.on('postback:D_CHECK', (payload, chat) => {
  chat.say('Pls type "dcheck" + the cryptocurrency that you want to check.\nExample: coin bitcoin, coin cardano, etc...')
})

bot.on('postback:SETTING', (payload, chat) => {
  propSetting(chat)
})

bot.on('postback:WATCH_DOG_SET', (payload, chat) => {
  watchDogInit(chat)
})

bot.on('postback:SET_WATCHDOGP', (payload, chat) => {
  chat.say(`The current percentage is "${watchDogP}" %`);
  chat.say('Pls write "setWDper" and then your wanted precentage for example(1, 5, 10, etc. ) ');
})

function watchDogInit(chat) {
  chat.say({
    text: 'Watch dog settings',
    buttons: [
      { type: 'postback', title: 'Change watched coin', payload: 'WATCH_DOG' },
      { type: 'postback', title: 'Change timer', payload: 'SET_TIMER' },
      { type: 'postback', title: 'Change watched %', payload: 'SET_WATCHDOGP' }
    ]
  })
}

bot.on('postback:SET_TIMER', (payload, chat) => {
  chat.say(`Timer is set for ${dogTimer / 60000} minutes.`)
  chat.say('Pls type "setdtimer" + time that you wish to watch.\nExample: setdtimer 15.\nTimer can be set just in MINUTES.\nTimer can be set for a least 5 minutes.')
})

bot.on('postback:SET_TOP7', (payload, chat) => {
  propChangeTop7P(chat);
})

bot.on('postback:TURN_ON', (payload, chat) => {
  if (watchDogC != null) {
    userId = payload.sender.id;
    clearInterval(dogTimeInt);
    chat.say(`Dog is watching ${watchDogC}.\nDoggo will check every ${dogTimer / 60000} minutes.\nIf the price changes more then ${watchDogP} % doggo will notify you. `);
    dogTimeInt = setInterval(dogWatch, dogTimer);
  } else {
    chat.say(`Doggo has no coin to watch.\nPls write "setdog" and then your wanted coin.`)
  }

})

bot.on('postback:TURN_OFF', (payload, chat) => {
  clearInterval(dogTimeInt);
  chat.say("Doggo went sleep.")

})

bot.on('postback:WATCH_DOG', (payload, chat) => {
  if (watchDogC == null) {
    chat.say('There is no coin for doggo to lookout.')
    chat.say('Pls write "setdog" and then your wanted coin for example( bitcoin, cardano, etherium, etc.) ');
  } else {
    propWatchDog(chat);
  }

});

function propWatchDog(chat) {
  chat.say({
    text: 'Watch Dog',
    buttons: [
      { type: 'postback', title: 'Turn on', payload: 'TURN_ON' },
      { type: 'postback', title: 'Turn off', payload: 'TURN_OFF' }
    ]
  })


}
async function dogWatch() {
  var link = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${watchDogC}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=1h`
  var response = await fetch(link);
  response = await response.json();
  console.log(response[0].name)

  console.log(response[0].price_change_percentage_1h_in_currency >= watchDogP)
  if (response[0].price_change_percentage_1h_in_currency >= watchDogP) {
    var text = `${response[0].name} raises to ${response[0].current_price}.\nIts current price is ${response[0].price_change_percentage_1h_in_currency} higher from 1 Hour ago.`
    bot.say(userId, text)
  }

}


bot.hear(/qcheck (.*)/i, (payload, chat, data) => {
  isSupported(data.match[1]).then(result => {
    if (result) {
      checkSpCoin(data.match[1]).then(result => chat.say(result))
    } else {
      chat.say(`Coin ${data.match[1]} is not supported.`)
    }
  })
});

bot.hear(/setcur (.*)/i, (payload, chat, data) => {
  //console.log(currency);
  var currencyName = data.match[1].toLowerCase();

  isCurrencySupported(currencyName).then(result => {
    if (result == true) {
      currency = currencyName;
      chat.say(`You selected ${currency} as your default currency`)
      propMenu(chat, false);
    } else {
      chat.say(`${data.match[1]} is not supported.`)
    }
  })
});

bot.hear(/setWDper (.*)/i, (payload, chat, data) => {

  var x = parseInt(data.match[1], 10)
  if (Number.isInteger(x)) {
    var temp = watchDogP;
    watchDogP = x;
    chat.say(`Change from ${temp}% to ${watchDogP}%`)
  }

  else { chat.say(`${data.match[1]} is not a number.`) }

});

bot.hear(/setpper (.*)/i, (payload, chat, data) => {

  var x = parseInt(data.match[1], 10)
  if (Number.isInteger(x)) {
    if (x > 0) {
      var temp = watchedPercentP;
      watchedPercentP = x;
      chat.say(`Change from ${temp}% to ${watchedPercentP}%`)
    } else {
      chat.say(`Percetage has to greater than 0.\n You typed ${x}%`)
    }

  }

  else { chat.say(`${data.match[1]} is not a number.`) }

});

bot.hear(/setmper (.*)/i, (payload, chat, data) => {

  var x = parseInt(data.match[1], 10)
  if (Number.isInteger(x)) {
    if (x < 0) {
      var temp = watchedPercentM;
      watchedPercentM = x;
      chat.say(`Change from ${temp}% to ${watchedPercentM}%`)
    } else {
      chat.say(`Percetage has to less than 0.\n You typed ${x}%`)
    }

  }

  else { chat.say(`${data.match[1]} is not a number.`) }

});


bot.hear(/setdog (.*)/i, (payload, chat, data) => {
  isSupported(data.match[1]).then(result => {
    if (result) {
      watchDogC = data.match[1].toLowerCase().replace(/ /g, "-");
      chat.say(`Dog will watch ${data.match[1]}.`);
      propWatchDog(chat)
    } else {
      chat.say(`${data.match[1]} is not supported.`)
    }
  })

});

bot.hear(/setdtimer (.*)/i, (payload, chat, data) => {
  var time = parseInt(data.match[1], 10)
  if (Number.isInteger(time)) {
    time = time * 60000
    if (time < dogTimer) {
      chat.say(`Timer can only be greater then 5 minutes.`)
    } else if( time == dogTimer) {
      chat.say(`Timer is already set for ${dogTimer / 60000} minutes.`)
    }
    else {
      dogTimer = time;
      chat.say(`Timer is set for ${dogTimer / 60000} minutes.`)
    }
  }
  else { chat.say(`${data.match[1]} is not a number.`) }

});




bot.hear(['---'], (payload, chat) => {

});

bot.hear(['menu'], (payload, chat) => {
  propMenu(chat, false)
  console.log(chat)
  setTimeout(propSetting, 500,chat);
 
});

bot.hear(['setting'], (payload, chat) => {
  chat.say({
    text: 'What do you need help with?',
    buttons: [
      { type: 'postback', title: 'Currency', payload: 'SET_CURRENCY' },
      { type: 'postback', title: 'Top7 %', payload: 'SET_TOP7' },
      { type: 'postback', title: 'Watch Dog', payload: 'WATCH_DOG_SET' }]
  });
});

bot.hear(/dcheck (.*)/i, (payload, chat, data) => {

  // hledat podle ID -- coiny s 2 slovy  jejich mezera se nahradi s "-"
  const coinName = data.match[1].toLowerCase().replace(/ /g, "-");
  isSupported(data.match[1]).then(result => {
    if (result == true) {
      checkDCoin(coinName).then(result => {

        var text = "";
        for (i = 0; i < result[0].length; i++) {
          text += `${result[0][i]} ${result[1][i]}\n`

        }
        chat.say(text)
      })
    } else {
      chat.say(`Coin ${coinName} is not supported.`)
    }

  })
});



function propMenu(chat, gettingStarted) {

  let textForMenu;
  if (gettingStarted) {
    textForMenu = 'Welcome to Cryptocheck. What are you looking for?';
  } else {
    textForMenu = 'Menu:';
  }
  chat.say({
    text: textForMenu,
    buttons: [

      { type: 'postback', title: 'Price check', payload: 'PRICE_CHECK' },
      { type: 'postback', title: 'Top7 Change', payload: 'PC_CHECK' },
      { type: 'postback', title: 'Watch Dog', payload: 'WATCH_DOG' }

    ]
  });
}
function propChangeTop7P(chat) {
  chat.say({
    text: 'Top 7',
    buttons: [
      { type: 'postback', title: 'Set % for winners', payload: 'SET_PPERCENT' },
      { type: 'postback', title: 'Set % for losers', payload: 'SET_MPERCENT' }
    ]
  });
}

function propPriceCheck(chat) {
  chat.say({
    text: 'Price Check',
    buttons: [
      { type: 'postback', title: 'Quick check', payload: 'Q_CHECK' },
      { type: 'postback', title: 'Detailed check', payload: 'D_CHECK' }
    ]
  });
}

function propPcCheck(chat) {
  chat.say({
    text: 'Top 7',
    buttons: [
      { type: 'postback', title: 'Top winner', payload: 'TOP_WINNERS' },
      { type: 'postback', title: 'Top losers', payload: 'TOP_LOSERS' }
    ]
  });
}

function propSetting(chat) {
  chat.say({
    text: 'Setting',
    buttons: [
      { type: 'postback', title: 'Currency', payload: 'SET_CURRENCY' },
      { type: 'postback', title: 'Top7 %', payload: 'SET_TOP7' },
      { type: 'postback', title: 'Watch Dog', payload: 'WATCH_DOG_SET' }

    ]
  });
}

function convertUnixToTime(timestamp) {
  let UNIX_timestamp = timestamp
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + '/' + month + '/' + year + ' ' + hour + ':' + min + ':' + sec;
  return time;
}

function roundUp(num) {
  return (Math.round(num * 100)/100).toFixed(2)
}

async function checkPriceChange(currency, vauleP, valueM) {
  const link = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h`
  let response = await fetch(link);
  response = await response.json();
  var arrayEmoji = ["one", "two", "three", "four", "five", "six", "seven"]
  var textP = `Current watched %: ${watchedPercentP}\n`;
  var textM = `Current watched %: ${watchedPercentM}\n`;
  var arrayInfo = ["Name:", "Price:", "1H change:"];
  var arrayMainP = [];
  var arrayMainM = [];

  var x;
  for (x in response) {
    if (response[x].price_change_percentage_1h_in_currency >= vauleP) {
      arrayMainP.push([
        response[x].name,
        response[x].current_price,
        response[x].price_change_percentage_1h_in_currency
      ]);
    }

    if (response[x].price_change_percentage_1h_in_currency <= valueM) {
      arrayMainM.push([
        response[x].name,
        response[x].current_price,
        response[x].price_change_percentage_1h_in_currency
      ]);
    }
  }
  arrayMainP.sort(function (a, b) {
    var valueA, valueB;

    valueA = a[2];
    valueB = b[2];
    if (valueA > valueB) {
      return -1;
    }
    else if (valueA < valueB) {
      return 1;
    }
    return 0;
  });

  arrayMainM.sort(function (a, b) {
    var valueA, valueB;

    valueA = a[2];
    valueB = b[2];
    if (valueA < valueB) {
      return -1;
    }
    else if (valueA > valueB) {
      return 1;
    }
    return 0;
  });

  if (arrayMainP.length > 7) {
    var i;
    var arrayTempP = [];
    for (i = 0; i < 7; i++) {
      arrayTempP.push(arrayMainP[i])
    }
    arrayMainP = arrayTempP
  }

  if (arrayMainM.length > 7) {
    var i;
    var arrayTempM = [];
    for (i = 0; i < 7; i++) {
      arrayTempM.push(arrayMainM[i])
    }
    arrayMainM = arrayTempM
  }

  for (x in arrayMainP) {
    textP += `${emoji.get(arrayEmoji[x])}\n${arrayInfo[0]} ${arrayMainP[x][0]}\n${arrayInfo[1]} ${arrayMainP[x][1]} ${currency}\n${arrayInfo[2]} ${roundUp(arrayMainP[x][2])} %\n`
  }

  for (x in arrayMainM) {
    textM += `${emoji.get(arrayEmoji[x])}\n${arrayInfo[0]} ${arrayMainM[x][0]}\n${arrayInfo[1]} ${arrayMainM[x][1]} ${currency}\n${arrayInfo[2]} ${roundUp(arrayMainM[x][2])} %\n`
  }
  
  if(arrayMainP.length == 0) {
    textP = null
  }

  if(arrayMainM.length == 0) {
    textM = null
  }
  var arrayEnd = [textP, textM]
  return arrayEnd
}

async function isCurrencySupported(sCurrency) {
  const linkSupportedCurrency = "https://api.coingecko.com/api/v3/simple/supported_vs_currencies";
  sCurrency = sCurrency.toLowerCase();
  let response = await fetch(linkSupportedCurrency);
  response = await response.json();
  let isSupported = false;
  var x;
  for (x in response) {
    if (response[x] == sCurrency) {
      isSupported = true;
      break;
    }
  }
  return isSupported;
}

async function isSupported(coin) {
  const linkSupportedCoin = "https://api.coingecko.com/api/v3/coins/list";
  coin = coin.toLowerCase().replace(/ /g, "-")
  let response = await fetch(linkSupportedCoin);
  response = await response.json();
  let isSupported = false
  var x;
  for (x in response) {
    if (response[x].id == coin) {
      isSupported = true;
      break;
    }
  }
  return isSupported;
}

async function checkDCoin(coin) {
  const detailSearch = `https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  let response = await fetch(detailSearch);
  response = await response.json();
  var arrayInfo = [
    coinName = response.name,
    price = `${response.market_data.current_price[`${currency}`]} ${currency.toUpperCase()}`,
    ath = `${response.market_data.ath[`${currency}`]} ${currency.toUpperCase()}`,
    athChange = `${roundUp(response.market_data.ath_change_percentage[`${currency}`])} %`,
    atl = `${response.market_data.atl[`${currency}`]} ${currency.toUpperCase()}`,
    atlChange = `${roundUp(response.market_data.atl_change_percentage[`${currency}`])} %`,
    totalVolume = `${response.market_data.total_volume[`${currency}`]} ${currency.toUpperCase()}`,
    high24 = `${response.market_data.high_24h[`${currency}`]} ${currency.toUpperCase()}`,
    low24 = `${response.market_data.low_24h[`${currency}`]} ${currency.toUpperCase()}`,
    price24Change = `${response.market_data.price_change_24h_in_currency[`${currency}`]} ${currency.toUpperCase()}`,
    price1hPchange = `${roundUp(response.market_data.price_change_percentage_1h_in_currency[`${currency}`])} %`,
    price24hPchange = `${roundUp(response.market_data.price_change_percentage_24h_in_currency[`${currency}`])} %`,
    price7dPchange = `${roundUp(response.market_data.price_change_percentage_7d_in_currency[`${currency}`])} %`,
    price14dPchange = `${roundUp(response.market_data.price_change_percentage_14d_in_currency[`${currency}`])} %`,
    price30dPchange = `${roundUp(response.market_data.price_change_percentage_30d_in_currency[`${currency}`])} %`,
    price1yPchange = `${roundUp(response.market_data.price_change_percentage_1y_in_currency[`${currency}`])} %`
  ]
  var arrayName = ["Name:", "Price:", "All-time high:", "Change from all-time high:", "All-time low:", "Change from all-time low:", "Traded volume:", "24-High:", "24-Low:"
    , "24H change:", "1H %-change:", "24H %-change:", "7D %-change:", "14D %-change:", "30D %-change:", "1Y %-change:"];


  var finalArray = [arrayName, arrayInfo]
  return finalArray

}
tryMe();
async function tryMe() {
  var asd = true;
  while(asd) {
    var ds = await setInterval(try2,3000)
  }
}
function try2() {
  console.log(asd)
}
async function checkSpCoin(coin) {
  const simplePrice = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
  let response = await fetch(simplePrice);
  response = await response.json();
  var price = response[`${coin}`][`${currency}`];
  var marketCap = response[`${coin}`][`${currency}_market_cap`];
  var vol24h = response[`${coin}`][`${currency}_24h_vol`];
  var change24h = response[`${coin}`][`${currency}_24h_change`];
  var lastUpdatedAt = convertUnixToTime(response[`${coin}`].last_updated_at);
  let text = `Price: ${price} ${currency.toUpperCase()}\nMarket cap: ${roundUp(marketCap)}\n24h volume: ${roundUp(vol24h)}\n24h change: ${roundUp(change24h)}\nLast updated: ${lastUpdatedAt}`;
  return text;
}
bot.start(port);