const BootBot = require('bootbot');
const config = require('config');
const fetch = require('node-fetch');
const CoinGecko = require('coingecko-api');

// yarn startTunnel
// yarn startDev
var port = process.env.PORT || config.get('PORT');

const bot = new BootBot({
  accessToken: config.get('ACCESS_TOKEN'),
  verifyToken: config.get('VERIFY_TOKEN'),
  appSecret: config.get('APP_SECRET')
});

// links
const searchCoin = "https://api.coingecko.com/api/v3/coins/";
const supportedCurrency = "https://api.coingecko.com/api/v3/simple/supported_vs_currencies";
const supportedCoins = "https://api.coingecko.com/api/v3/coins/list";

// variable
var currency = 'usd';
var supportedCurrencies = null;
var spCurrencyCheck = null;

bot.hear(/spcheck (.*)/i,(payload, chat, data) => {
  spCheckCoin = data.match[1];
  checkSpCoin(spCheckCoin).then(result => chat.say(result))
});

// payload = obsah chatu; chat == konkretni chat
bot.on('message', (payload, chat) => {
	const text = payload.message.text;
	console.log(`The user said: ${text}`);
});

bot.setGreetingText('Hey there! Welcome to Cryptocheck!');

bot.setGetStartedButton((payload, chat) => {
  propMenu(chat,true);
});

bot.on('postback:SET_CURRENCY', (payload, chat) => {
  fetchingCurrency();
  chat.say(`The current currency is "${currency}"`);
  chat.say('Pls write "set_cur" and then your wanted currency for example( czk, usd, eur, etc.) '); 
});

bot.on('postback:CHECK_CRYPTOCURRENCY', (payload,chat) => {
  chat.say('Pls type "coin" + the cryptocurrency that you want to check.\nExample: coin bitcoin, coin cardano, etc...')
})

bot.hear(/load_list (.*)/i,(payload, chat, data) => {
  if(data.match[1] == 1) { 
    fetchingCurrency();
    chat.say(`List is loaded.\nDefault currency is ${currency}.\nPls type "set_cur" + the currency to try again.`)
  } else {
    chat.say(`You typed ${data.match[1]} \nPlease type "load_list 1" to loading the list.`)
  }
 
});

bot.hear(/set_cur (.*)/i,(payload, chat, data) => {
  //console.log(currency);
  const currencyName = data.match[1].toLowerCase();

  isSupported = false;
  // console.log(supportedCurrencies);
  if (supportedCurrencies != null) {
    var x;
    for (x in supportedCurrencies) {
      if(currencyName == supportedCurrencies[x]) {
          isSupported = true;
         break;
      }
    };
    setCurrencyName(isSupported,currencyName,chat);
  } else {
    chat.say('The list of supported currencies is not loaded.\nPlease type "load_list 1" to loading the list.' )
  }
  //console.log(currency);
});

bot.hear(['try'], (payload, chat) => {

  fetch(supportedCoins).then(res => res.json()).then(json => {

     var x;
     var i = 0;
     for (x in json) {
      if(json[x].id == 'timers') {
        console.log(true)
        console.log(x)
      }
     }
    
  });

});

bot.hear(['---'], (payload, chat) => {

});

bot.hear(['menu'], (payload, chat) => {
  propMenu(chat,false)
});

bot.hear(['setting'], (payload, chat) => {
	chat.say({
    text: 'What do you need help with?',
    buttons: [
      { type: 'postback', title: 'Set currentcy', payload: 'SET_CURRENCY' },
    ]
  });
});

bot.hear(/coin (.*)/i,(payload, chat, data) => {
  
    // hledat podle ID -- coiny s 2 slovy  jejich mezera se nahradi s "-"
    const coinName = data.match[1].toLowerCase().replace(/ /g, "-");
   
    fetch(searchCoin + coinName).then(res => res.json()).then(json => {
     
      if (json.error == 'Could not find coin with the given id'){
        chat.say("Something went wrong pls try again")
      } else {
        chat.say(`ID: ${json.id}\nSymbol: ${json.symbol}\nName: ${json.name}\nPrice:${json.market_data.current_price[`${currency}`]} ${currency.toUpperCase()}`)
      };
    });

  
});

function setCurrencyName (isSupported,currencyName,chat){
  if (isSupported){
    currency = currencyName;
    chat.say(`You selected ${currency} as your default currency`)
    propMenu(chat,false);
  } else {
    chat.say('Something went wrong.')
  }
  //console.log(isSupported,currencyName);
}

function fetchingCurrency () {
  fetch(supportedCurrency).then(res => res.json()).then(json => {
    supportedCurrencies = json;  
  })
}

function isEmpty(obj) { 
  for (var x in obj) { return false; }
  return true;
}

function convertUnixToTime(timestamp) {
  let UNIX_timestamp = timestamp
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

function propMenu(chat, gettingStarted) {
  let textForMenu = ""
  if(gettingStarted) {
    textForMenu = 'Welcome to Cryptocheck. What are you looking for?';
  } else {
    textForMenu = 'Menu:'
  }
  chat.say({
    text: textForMenu,
    buttons: [
      { type: 'postback', title: 'Price check', payload: 'CHECK_CRYPTOCURRENCY' },
      { type: 'postback', title: 'Crypto price check', payload: 'CHECK_CRYPTOCURRENCY' },
      { type: 'postback', title: 'Set currentcy', payload: 'SET_CURRENCY' }
    ]
  });
}

async function checkSpCoin (coin) {

  const simplePrice = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
  let response = await fetch(simplePrice);
  response = await response.json();
  let text = "";
  if(isEmpty(response) == true) {

    text = "Something went wrong pls try again"

  } else {

    var price = response[`${spCheckCoin}`][`${currency}`];
    var marketCap = response[`${spCheckCoin}`][`${currency}_market_cap`];
    var vol24h = response[`${spCheckCoin}`][`${currency}_24h_vol`];
    var change24h = response[`${spCheckCoin}`][`${currency}_24h_change`];
    var lastUpdatedAt = convertUnixToTime(response[`${spCheckCoin}`].last_updated_at);
    text = `Price: ${price} \nMarket cap: ${marketCap}\n24h volume: ${vol24h}\n24h change: ${change24h}\nLast updated: ${lastUpdatedAt}`;

  }
  return text;
  
  
 
};
bot.start(port);