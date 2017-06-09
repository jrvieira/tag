const irc = require('irc');
const $ = require('colors');

var my = {
	server: 'irc.freenode.net',
	channels: [],
	nick: '[tag]',
};

//create the bot (autoconnect by default)
var bot = new irc.Client(my.server, my.nick, {
	userName: '[tag]',
	realName: '[tag]',
//	port: 6667,
//	localAddress: null,
//	autoConnect: true,
//	debug: true,
//	showErrors: false,
//	autoRejoin: false,
	channels: my.channels,
//	secure: true,
//	selfSigned: false,
//	certExpired: false,
//	floodProtection: true,
//	floodProtectionDelay: 500,
	retryCount: 0,
//	retryDelay: 2000,
//	stripColors: false,
//	channelPrefixes: '&#',
//	messageSplit: 512,
//	encoding: '',
//	sasl: true,
	password: process.argv[2]
}).on('error', function (msg) {
    console.log('error: ', msg);
});

var lastcommand = '';

//catch events
bot.on('raw', function (msg) {

	//ignore pongs
	if (msg.command == 'PONG') return false;

	//format console output
	var comm = $.red(msg.command||'');
	var nick = $.cyan(msg.nick||'');
	var args = [];
	msg.args.forEach(function (arg, i, arr) {
		args[i] = i % 2 ? arg : $.dim(arg);
	});
	args = args.join(' ');

	//log bot commands
	if (msg.nick == bot.nick) {

		if (msg.command != lastcommand) {
			console.info('');
			console.info($.magenta(msg.command));
		}
		console.info($.magenta(bot.nick), args);

	} else {

		if (msg.command != lastcommand) {
			console.info('');
			console.info(comm);
		}
		console.info(nick ? nick+' '+args : args);

	}

	lastcommand = msg.command;	

	//emit COMMANDS
	bot.emit(msg.command, msg);
	//emit it COMMANDS as it#[command]
	if (msg.nick == it) bot.emit('it#'+msg.command, msg);

});


bot.on('selfMessage', function (to, text) {
	if ('PRIVMSG' != lastcommand) {
		console.info('');
		console.info($.magenta('PRIVMSG'));
	}
	console.info($.magenta(bot.nick), $.dim(to), text);
	lastcommand = 'PRIVMSG';	
});

//bot config

//it
var it = 'zzz';
var tagged = {};

tagged[it] = [{
	timestamp: +new Date(),
	tagger: bot.nick
}];

//bot actions
var act = {

	hi: function (data) {
		console.info($.magenta('hi!'));
	},

	info: function (data) {
		console.info($.magenta('info'));
	},

	stats: {
		global: function (data) {
			console.info($.magenta('stats'));
		},
		user: function	(data) {
			var users = data.text.splice(1);
			for (let user of users) {
				if (user == bot.nick) {
					console.info($.magenta('bot stats for '+user));
				} else {
					console.info($.magenta('user stats for '+user));
				}
			}
		}
	},

	tag: function (data) {

		var tag = data.text[1];

		if ( tag == bot.nick || tag == it ) return false;

		var txt = data.text.slice(2).join(' ');
		
		//validate target
		bot.whois(tag, function (msg) {

			if (new Set(msg.channels).has(data.chan)) {
				//action on channel it was tagged
				bot.action(data.chan, it+' tagged '+tag+' on this channel! '+txt);
				/*
				//notice on all chans the bot is in
				for (let chan of bot.chans) {
					if (chan != data.chain) bot.notice(chan, it+' tagged '+tag+' on '+data.chan+'! '+txt);
				}
				*/
				//notice all tagged users
				for (let user in tagged) {
					bot.notice(user, it+' tagged '+tag+' on '+data.chan+'! '+txt);
				}

				//create new record
				var newrecord = {
					timestamp: +new Date(),
					tagger: it,
					channel: data.chan,
					txt: data.txt
				}
				//update tagger record
				var taggerslastrecord = tagged[it][tagged[it].length - 1];
				taggerslastrecord.tag = newrecord;
				//create tagged record
				tagged[tag] = tagged[tag] || [];
				tagged[tag].push(newrecord);

				//IMPORTANT: this means that if a record has no tag property, that it's the active one
				
				it = tag;
				bot.action(it, 'tag, you\'re it!');

			} else {

				act.info({user: it, chan: it, text:''});

			}


		});

	},

}

//bot events [COMMAND], it#[COMMAND], bot#[COMMAND]

//keys: i/n = it/nit, p/# = pm/channel, x/!/? = ncmd/!cmd/?cmd, a// args/nargs, m/* mention/nmention

var keys = {
	'np': act.hi,
	'n#xm': act.hi,
	'!/': act.info,
	'?/': act.stats.global,
	'?a': act.stats.user,
	'i#!a*': act.tag
}

function match (set, sub) {
	for (var el of sub) {
		if (!set.has(el)) return false;
	}
	return true;
}

bot.on('PRIVMSG', function (msg) {

	var data = {
		user: msg.nick,
		chan: msg.args[0],
		text: msg.args[1].split(' ')
	}

	//generate keyset
	var keyset = new Set([
		// n/i = it/notit
		(data.user == it ? 'i' : 'n'),
		// #/p = public/private
		(data.chan == bot.nick ? 'p' : '#'),

		data.text[0] == '!tag' ? '!' : data.text[0] == '?tag' ? '?' : 'x',

		data.text[1] ? 'a' : '/',

		// m/* = mention/no mention
		(data.text.includes(bot.nick) ? 'm' : '*')
		
	]);

	for (let key in keys) {
		//run the function
		if (match(keyset, key)) keys[key](data);
	}

});

//follow invites
bot.on('INVITE', function (msg) {
	var target = msg.args[0];
	var channel = msg.args[1];
	bot.join(channel);
});

bot.join(my.channels.join(' '), function() {
	/*
	//ask for op
	console.info();
	console.info($.magenta(arguments));
	*/
});

