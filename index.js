const BootBot = require('bootbot');
const config = require('config');
const fetch = require('node-fetch');
const CoinGecko = require('coingecko-api');
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
var watchedPercentP = 1;
var watchedPercentM = -1;
var timer = 300000;
var watchDogP = 5;
var userId,watchDog;


bot.setGreetingText('Hey there! Welcome to Cryptocheck!');

bot.setGetStartedButton((payload, chat) => {
  propMenu(chat, true);
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


bot.on('postback:SET_PERCENT', (payload, chat) => {
  chat.say(`The current percent is "${watchedPercentP}" %`);
  chat.say('Pls write "setper" and then your wanted currency for example( czk, usd, eur, btc, eth, etc.) ');
});

bot.on('postback:Q_CHECK', (payload, chat) => {
  chat.say('Pls type "qcheck + the cryptocurrency that you want to check.\nExample: coin bitcoin, coin cardano, etc...')
})

bot.on('postback:PRICE_CHECK', (payload, chat) => {
  propPriceCheck(chat);
})

bot.on('postback:PC_CHECK', (payload, chat) => {
  checkPriceChange(currency, watchedPercentP, watchedPercentM).then(result => {
    chat.say(result[0]);
    chat.say(result[1]);
  });
})

bot.on('postback:D_CHECK', (payload, chat) => {
  chat.say('Pls type "dcheck" + the cryptocurrency that you want to check.\nExample: coin bitcoin, coin cardano, etc...')
})

bot.on('postback:SETTING', (payload, chat) => {
  propSetting(chat)
})

bot.on('postback:WATCHDOG', (payload, chat) => {
  if (watchDog == null) {
    chat.say('Pls write "setdog" and then your wanted coin for example( bitcoin, cardano, etherium, etc.) ');
  } else {
    userId = payload.sender.id;
    setInterval(dogWatch,5000);
  }
  
});

async function dogWatch () {

var link = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${watchDog}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=1h`  
var response = await fetch(link);
response = await response.json();

console.log(response[0].price_change_percentage_1h_in_currency >= watchDogP)
if (response[0].price_change_percentage_1h_in_currency >= watchDogP) {
  var text = `${response[0].name} raises to ${response[0].current_price}.\nIts current price is ${response[0].price_change_percentage_1h_in_currency} higher from 1 Hour ago.`
  bot.say(userId,text)
}

}

bot.hear(/qcheck (.*)/i, (payload, chat, data) => {
  isSupported(data.match[1]).then(result => {
    if (result == true) {
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
bot.hear(/setper (.*)/i, (payload, chat, data) => {

  var x = parseInt(data.match[1], 10)
  if (Number.isInteger(x)) {
    watchedPercentP = x;
    chat.say(`Change percent to ${watchedPercentP}%`)
  }

  else { chat.say(`${data.match[1]} is not a number.`) }

});
bot.hear(/setdog (.*)/i, (payload, chat, data) => {
  isSupported(data.match[1]).then(result => {
    if (result) {
      watchDog = data.match[1].toLowerCase().replace(/ /g, "-");
    } else {
      chat.say(`${data.match[1]} is not supported.`)
    }
  })

});

bot.hear(/setdtimer (.*)/i, (payload, chat, data) => {
  var time = parseInt(data.match[1], 10)
  if (Number.isInteger(time)) {
    time = time*60000
    if(time <= timer ) {
      chat.say(`Timer can only be greater then 5 minutes.`)
    } else {
      timer = time;
    }
  }
  else { chat.say(`${data.match[1]} is not a number.`) }

});




bot.hear(['---'], (payload, chat) => {

});

bot.hear(['menu'], (payload, chat) => {
  propMenu(chat, false)
});

bot.hear(['setting'], (payload,chat) => {
  chat.say({
    text: 'What do you need help with?',
    buttons: [
      { type: 'postback', title: 'Set currency', payload: 'SET_CURRENCY' },
      { type: 'postback', title: 'Set percent', payload: 'SET_PERCENT' }
    ]
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
      { type: 'postback', title: 'Watch Dog', payload: 'WATCHDOG' }

    ]
  });
  chat.say({
    text: "Setting:",
    buttons: [
      { type: 'postback', title: 'Set currency', payload: 'SET_CURRENCY' },
      { type: 'postback', title: 'Set percent', payload: 'SET_PERCENT' },
      
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

function propSetting(chat) {
  chat.say({
    text: 'Setting',
    buttons: [
      { type: 'postback', title: 'Set currency', payload: 'SET_CURRENCY' },
      { type: 'postback', title: 'Set percent', payload: 'SET_PERCENT' }
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


async function checkPriceChange(currency, vauleP, valueM) {
  const link = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h`
  let response = await fetch(link);
  response = await response.json();
  var arrayEmoji = ["one", "two", "three", "four", "five", "six", "seven"]
  var textP = "In Plus \n";
  var textM = "In Minus \n";
  var arrayInfo = ["Name:", "Price:", "1H %-change:"];
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
    textP += `${emoji.get(arrayEmoji[x])}\n${arrayInfo[0]} ${arrayMainP[x][0]}\n${arrayInfo[1]} ${arrayMainP[x][1]}\n${arrayInfo[2]} ${arrayMainP[x][2]}\n`
  }

  for (x in arrayMainM) {
    textM += `${emoji.get(arrayEmoji[x])}\n${arrayInfo[0]} ${arrayMainM[x][0]}\n${arrayInfo[1]} ${arrayMainM[x][1]}\n${arrayInfo[2]} ${arrayMainM[x][2]}\n`
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
    athChange = `${response.market_data.ath_change_percentage[`${currency}`].toFixed(2)} %`,
    atl = `${response.market_data.atl[`${currency}`]} ${currency.toUpperCase()}`,
    atlChange = `${response.market_data.atl_change_percentage[`${currency}`].toFixed(2)} %`,
    totalVolume = `${response.market_data.total_volume[`${currency}`]} ${currency.toUpperCase()}`,
    high24 = `${response.market_data.high_24h[`${currency}`]} ${currency.toUpperCase()}`,
    low24 = `${response.market_data.low_24h[`${currency}`]} ${currency.toUpperCase()}`,
    price24Change = `${response.market_data.price_change_24h_in_currency[`${currency}`]} ${currency.toUpperCase()}`,
    price1hPchange = `${response.market_data.price_change_percentage_1h_in_currency[`${currency}`].toFixed(2)} %`,
    price24hPchange = `${response.market_data.price_change_percentage_24h_in_currency[`${currency}`].toFixed(2)} %`,
    price7dPchange = `${response.market_data.price_change_percentage_7d_in_currency[`${currency}`].toFixed(2)} %`,
    price14dPchange = `${response.market_data.price_change_percentage_14d_in_currency[`${currency}`].toFixed(2)} %`,
    price30dPchange = `${response.market_data.price_change_percentage_30d_in_currency[`${currency}`].toFixed(2)} %`,
    price1yPchange = `${response.market_data.price_change_percentage_1y_in_currency[`${currency}`].toFixed(2)} %`
  ]
  var arrayName = ["Name:", "Price:", "All-time high:", "Change from all-time high:", "All-time low:", "Change from all-time low:", "Traded volume:", "24-High:", "24-Low:"
    , "24H change:", "1H %-change:", "24H %-change:", "7D %-change:", "14D %-change:", "30D %-change:", "1Y %-change:"];


  var finalArray = [arrayName, arrayInfo]
  return finalArray

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
  let text = `Price: ${price} ${currency.toUpperCase()}\nMarket cap: ${marketCap}\n24h volume: ${vol24h}\n24h change: ${change24h}\nLast updated: ${lastUpdatedAt}`;
  return text;
}
bot.start(port);