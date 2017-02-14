var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3733, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

//bot.dialog('/', function (session) {
   // session.send("Hello World");
//});
// Add first run dialog


var bot = new builder.UniversalBot(connector, function (session) {
    session.send("Start order piza by saying order pizza.");
});

// Setup help system
bot.recognizer(new builder.RegExpRecognizer('OrderIntent', /order.*pizza/i));
bot.dialog('orderPiza', [function (session, args) {
    if(!args.continueOrder) {
        session.userData.cart = [];
        session.send("Any time you can ask for cancel, view cart, place order");
    }
    
    builder.Prompts.choice(session,'What do you want to order?', 'Pizza|Drinks|extras');
    },
    function(session, results) {
        var choice = results.response.entity;
        session.beginDialog('add/'+choice);
    },
    function(session, result) {
        if (result.response) {
            session.send('Your choice is: '+result.response);
            session.userData.cart.push(result.response);
            session.send('your cart: '+session.userData.cart);
        }
        session.replaceDialog('orderPiza', {continueOrder: true})
    }

]).triggerAction({ matches: 'OrderIntent' })
    .cancelAction('cancelOrderAction','Order cancelled.', 
    {
        matches: /(cancel.*order|^cancel)/i,
        confirmPrompt:"Are you sure to cancel the order?"
    }
    )
    .beginDialogAction('view cart', 'viewCart', {matches: /view.*cart/i})
    .beginDialogAction('checkout','checkOut',{matches:/^checkout/i});

bot.dialog('add/Pizza', [function(session, arg) {
    builder.Prompts.choice(session,"What kind of pizza?", "Hawaiian|Meat Lovers|Supreme|Cheese");
},
    function(session, result) {
        session.dialogData.pizza = result.response.entity;
        builder.Prompts.choice(session,"What size of pizza?", "Small 8'|Medium 10'|Large 12'");
    },
    function(session, result) {
        var item = result.response.entity+" "+session.dialogData.pizza+" pizza";
        session.endDialogWithResult({response: item});
    }

]).cancelAction('cancelItemAction', "Item canceled.",
        {matches:/(cancel.*item|^cancel)/i});

bot.dialog('add/Drinks', [function(session, arg){
   builder.Prompts.choice(session,"What kind of drinks?", "Water|Pepsi|Coca-cola|Lemonade");
},
    function(session, result) {
        session.dialogData.drink = result.response.entity;
        builder.Prompts.choice(session,"What size of cup?", "Small|Medium|Large");
    },
    function(session, result) {
        var item = result.response.entity+" cup of "+session.dialogData.drink;
        session.endDialogWithResult({response: item});
    }

]).cancelAction('cancelItemAction', "Item canceled.",
        {matches:/(cancel.*item|^cancel)/i});

bot.dialog('add/extras', [function(session, arg){
    builder.Prompts.choice(session,"What extra item you need?", "French fries|Lays|Grape");
},
    function(session, result) {
        var item = result.response.entity;
        session.endDialogWithResult({response: item});
    }

]).cancelAction('cancelItemAction', "Item canceled.",
        {matches:/(cancel.*item|^cancel)/i});

bot.dialog('checkOut', function(session,arg){
    var cart = session.userData.cart;
        session.send("Cart : "+ cart);

    if(cart.length <= 0) {
         session.send('your cart is empty, cannot continue with checkout. Try adding items to your cart');
        session.replaceDialog('orderPiza', {continueOrder : false});
    } else {
        session.endConversation('Your order is on the way');
    }
})

bot.dialog('viewCart', function(session,arg){
    var cart = session.userData.cart;
    session.send("Cart : "+cart);
    if (cart.length <= 0) {
         session.send('your cart is empty, cannot continue with checkout. Try adding items to your cart');
        session.replaceDialog('orderPiza',{continueOrder : false});
    } else {
        var msg = "Your items in the cart";
       for (var i=0; i<cart.length; i++) {
            msg += "\n* " + cart[i];
       }
       session.endDialog(msg);
    }
})



function switchTasks(session, args, next, alreadyActiveMessage) {
    // Check to see if we're already active.
    // - We're assuming that we're being called from a triggerAction() some
    //   args.action is the fully qualified dialog ID.
    var stack = session.dialogStack();
    if (builder.Session.findDialogStackEntry(stack, args.action) >= 0) {
        session.send(alreadyActiveMessage);
    } else {
        // Clear stack and switch tasks
        session.clearDialogStack();
        next();
    }
}
