$(function(){
	LiteFM.main();
});

var LiteFM = (function(){

	var data = {
		sid: '',
		type: '',
		token: '',
		expire: '',
		user_id: '',
		channel: 1,
		version: 100,
		app_name: 'radio_desktop_win'
	};

	var song;

	var songs = [];

	var app = HAE.app;

	var audio = new Audio();

	var menu = new HAE.Menu();

	var tray = new HAE.TrayIcon();

	var api = 'http://www.douban.com/j/app/radio/people';

	var main = function(){
		initView();
		initEvent();
	};

	var initView = function(){
		var x = HAE.getData('x');
		var y = HAE.getData('y');
		var volume = HAE.getData('volume');

		if(volume === ''){
			volume = 0.8;
		}

		app.show();
		app.setPos(x, y);
		app.setSize(260, 260);
		app.setMinSize(200, 200);
		app.setMaxSize(300, 300);
		app.setResizerMargin(30);
		app.setFrameless(true);
		app.setStaysOnTop(true);
		app.setShowInTaskbar(false);
		app.setTransBackground(true);

		menu.toggle = new HAE.MenuItem('隐藏');
		menu.lyric = new HAE.MenuItem('歌词');
		menu.login = new HAE.MenuItem('登陆');
		menu.logout = new HAE.MenuItem('登出');
		menu.exit = new HAE.MenuItem('退出');
		menu.lyric.setCheckable(true);
		menu.addItem(menu.toggle);
		menu.addItem(menu.lyric);
		menu.addItem(menu.login);
		menu.addItem(menu.logout);
		menu.addItem(menu.exit);

		tray.setToolTip(document.title);
		tray.setContextMenu(menu);
		tray.show();

		audio.volume = (volume);
		Lyric.init();
		Account.init();
		Channels.init();

		$('#title').text(document.title);
	};

	var initEvent = function(){
		app.addEvent({
			show: function(){
				menu.toggle.setText('隐藏');
			},
			hide: function(){
				menu.toggle.setText('显示');
			}
		});
		menu.toggle.addEvent({trigger: toggle});
		menu.lyric.addEvent({trigger: Lyric.toggle});
		menu.login.addEvent({trigger: Account.login});
		menu.logout.addEvent({trigger: Account.logout});
		menu.exit.addEvent({trigger: exit});
		tray.addEvent({
			activate: function(reason){
				reason == 3 && toggle();
			}
		});
		$(window).bind({
			beforeunload: function(){
				tray.hide();
				tray = null;
			}
		});
		$(audio).bind({
			play: function(){
				$('.play').addClass('pause');
			},
			pause: function(){
				if(audio.currentTime == audio.duration){
					playNext();
					sendRequest('e');
				}
				$('.play').removeClass('pause');
			}
		});
		$(document).bind({
			keydown: function(event){
				if(event.keyCode == 123){
					app.showInspector();
				}
			},
			mousedown: function(event){
				if(event.which == 1 && event.target.tagName != 'INPUT'){
					app.dragStart();
				}
			},
			mouseup: function(event){
				if(event.which == 1){
					HAE.setData('x', app.x);
					HAE.setData('y', app.y);
					app.dragStop();
				}
			},
			contextmenu: function(){
				if(event.target.tagName != 'INPUT'){
					menu.exec(event.screenX, event.screenY);
					return false;
				}
			},
			selectstart: function(){
				return event.target.tagName == 'INPUT';
			},
			dragenter:function(e){
				e.preventDefault();
			},
			dragover:function(e){
				e.preventDefault();
			},
			drop:function(e){
				e.preventDefault();
			},
			dragleave:function(e){
				e.preventDefault();
			}
		});
		$('#player').bind({
			mousewheel: function(event){
				var volume = audio.volume;
				if(event.originalEvent.wheelDelta > 0){
					volume += 0.1;
				}else{
					volume -= 0.1;
				}
				if(volume < 0){
					volume = 0;
				}else if(volume > 1){
					volume = 1;
				}
				audio.volume = volume;
				HAE.setData('volume', volume);
			}
		});
		$('#controls').delegate('.button', {
			mousedown: function(){
				return false;
			},
			click: function(){
				var that = this;
				$(this).removeClass('scale');
				setTimeout(function(){
					animate(that, 'scale', function(){
						$(this).removeClass('scale');
					});
				});
			}
		});
		$('#controls .close').bind({
			click: exit
		});
		$('#controls .like').bind({
			click: function(){
				if(! data.user_id){
					Account.login();
					return false;
				}
				if($(this).toggleClass('liked').hasClass('liked')){
					sendRequest('r');
				}else{
					sendRequest('u');
				}
			}
		});
		$('#controls .play').bind({
			click: function(event){
				if($(this).toggleClass('pause').hasClass('pause')){
					audio.play();
				}else{
					audio.pause();
				}
			}
		});
		$('#controls .skip').bind({
			click: function(){
				if(songs.length){
					playNext();
					sendRequest('s');
				}else{
					sendRequest('s', playNext);
				}
			}
		});
		$('#controls .list').bind({
			click: function(){
				Channels.show();
				return false;
			}
		});
	};

	var animate = function(selector, animation, callback){
		$(selector).addClass(animation).one('webkitAnimationEnd', function(){
			$(this).removeClass(animation);
			callback && callback();
		});
	};

	var sendRequest = function(type, callback){
		var request = {};
		sendRequest = function(type, callback){
			data.type = type;
			request[type] && request[type].abort();
			request[type] = $.ajax({
				url: api,
				data: data,
				dataType: 'json',
				success: function(json){
					if(json.song && json.song.length){
						songs = json.song;
					}
					callback && callback(json);
				}
			});
		};
		sendRequest(type, callback);
	};

	var playChannel = function(channel){
		audio.pause();
		data.channel = channel;
		HAE.setData('channel', data.channel);
		sendRequest('n', playNext);
	};

	var playNext = function(){
		if(songs.length){
			song = songs.shift();
			data.sid = song.sid;
			audio.pause();
			audio.src = song.url;
			audio.play();
			Lyric.play();
			if(song.like){
				$('.like').addClass('liked');
			}else{
				$('.like').removeClass('liked');
			}
			$('#picture').css({
				backgroundImage: 'url(' + song.picture + ')'
			});
			$('#player').prop('title', '『' + song.title + '』- ' + song.artist);
			if(! songs.length){
				sendRequest('n');
			}
		}else{
			sendRequest('n', playNext);
		}
	};

	var play = function(name){
		$.ajax({
			url: 'http://sug.music.baidu.com/info/suggestion',
			dataType: 'json',
			data: {
				from: 0,
				word: name,
				version: 2
			},
			success: function(json){
				var suggestion;
				var data = json.data;
				if(suggestion = data.song[0]){
					songs = [];
					song = {
						title: suggestion.songname,
						artist: suggestion.artistname,
						picture: 'http://tp3.sinaimg.cn/1562087202/180/40038430931/1'
					};
					playBaiduSong(data.song[0].songid);
					$('.like').addClass('liked');
					$('#picture').css({
						backgroundImage: 'url(' + song.picture + ')'
					});
					$('#player').prop('title', '『' + song.title + '』- ' + song.artist);
				}
			}
		});
	};

	var playBaiduSong = function(sid){
		$.ajax({
			url: 'http://play.baidu.com/data/music/songlink',
			dataType: 'json',
			data: {songIds: sid},
			success: function(json){
				var suggestion;
				var songs = json.data.songList;
				if(suggestion = songs[0]){
					audio.pause();
					audio.src = suggestion.songLink;
					audio.play();
					Lyric.load('http://play.baidu.com' + suggestion.lrcLink);
				}
			}
		});
	};

	var toggle = function(){
		var visible = ! app.isVisible();
		app.setVisible(visible);
		if(visible){
			app.activate();
		}else{
			tray.showMessage(document.title, '么么哒~\r\n我在这里╭(╯3╰)╮');
		}
	};

	var exit = function(){
		audio.src = '';
		Lyric.close();
		animate('body', 'exit', function(){
			app.close();
		});
		return false;
	};

	var Account = (function(){

		var init = function(){
			initView();
			initEvent();
		};

		var initView = function(){
			var email = HAE.getData('email');
			var token = HAE.getData('token');
			var expire = HAE.getData('expire');
			var user_id = HAE.getData('user_id');
			if(new Date().getTime() < expire * 1000){
				data.token = token;
				data.expire = expire;
				data.user_id = user_id;
				menu.login.setVisible(false);
			}else{
				$('#email').val(email);
				menu.logout.setVisible(false);
			}
		};

		var initEvent = function(){
			$('#form').bind({
				submit: function(){
					var flag = true,
						email = $.trim($('#email').val()),
						password = $.trim($('#password').val());
					if(! email){
						flag = false;
						animate('#email', 'shake');
					}
					if(! password){
						flag = false;
						animate('#password', 'shake');
					}
					if(flag){
						getToken(email, password);
					}
					return false;
				}
			});
			$('#cancel').bind({
				click: function(){
					$('#login').removeClass('scale-in');
					$('#controls').removeClass('scale-out');
				}
			});
		};

		var getToken = function(email, password){
			$.ajax({
				url: 'http://www.douban.com/j/app/login?app_name=radio_desktop_win&version=100',
				data: {
					email: email,
					password: password
				},
				success: function(json){
					if(json.err == 'invalidate_email'){
						animate('#email', 'shake');
						return;
					}else if(json.err == 'wrong_password'){
						animate('#password', 'shake');
						return;
					}else{
						menu.login.setVisible(false);
						menu.logout.setVisible(true);
						HAE.setData('email', data.token = email);
						HAE.setData('token', data.token = json.token);
						HAE.setData('expire', data.expire = json.expire);
						HAE.setData('user_id', data.user_id = json.user_id);
					}
					$('#cancel').click();
				}
			});
		};

		var login = function(){
			$('#player').removeClass('flip');
			$('#login').addClass('scale-in');
			$('#controls').addClass('scale-out');
		};

		var logout = function(){
			if(data.channel < 1){
				playChannel(1);
			}
			menu.login.setVisible(true);
			menu.logout.setVisible(false);
			data.token = undefined;
			data.expire = undefined;
			data.user_id = undefined;
			HAE.removeData('token');
			HAE.removeData('expire');
			HAE.removeData('user_id');
			$('.like').removeClass('liked');
		};

		return {
			init: init,
			login: login,
			logout: logout
		};
	})();

	var Channels = (function(){

		var api = 'http://douban.fm/j/explore/hot_channels';

		var channels = [
			{id: 0, name: '私人兆赫', banner: 'http://img3.douban.com/lpic/s3336480.jpg'},
			{id: -3, name: '红心兆赫', banner: 'http://img3.douban.com/lpic/s4716733.jpg'}
		];

		var init = function(){
			initView();
			initEvent();
		};

		var initView = function(){
			data.channel = HAE.getData('channel') || 1;
			playChannel(data.channel);
			$.ajax({
				url: api,
				dataType: 'json',
				success: function(json){
					var html = [];
					channels = channels.concat(json.data.channels);
					for(var i = 0, l = channels.length; i < l; ++i){
						var item = channels[i];
						html.push(buildItem(item));
					}
					$('#list').html(html.join('')).children('.item-cur').mouseenter();
				}
			});
		};

		var initEvent = function(){
			var timer;
			app.addEvent({
				mouseenter: function(){
					clearTimeout(timer);
				},
				mouseleave: function(){
					clearTimeout(timer);
					timer = setTimeout(function(){
						$('#player').removeClass('flip');
					}, 300);
				},
			});
			$('#list').bind({
				contextmenu: function(){
					return false;
				}
			}).delegate('.item', {
				mousedown: function(){
					return false;
				},
				mouseenter: function(){
					$('#banner').css({
						backgroundImage: 'url(' + $(this).data('banner') + ')'
					});
				},
				click: function(){
					var channel = $(this).data('channel')
					$('#list .item-cur').removeClass('item-cur');
					$(this).addClass('item-cur');
					if(channel < 1 && ! data.user_id){
						Account.login();
					}else{
						playChannel(channel);
					}
				}
			});
		};

		var buildItem = function(item){
			return '<li class="item" data-channel="' + item.id + '" data-banner="' + item.banner + '">' + item.name + '</li>';
		};

		var show = function(){
			$('#player').addClass('flip');
			$('#list .item-cur').removeClass('item-cur');
			$('#list .item[data-channel=' + data.channel + ']').addClass('item-cur').mouseenter();
		};

		return {
			init: init,
			show: show
		};
	})();

	var Lyric = (function(){

		var app;

		var that;

		var lyrics = [];

		var current = '';

		var api = 'http://music.douban.com/api/song/info';

		var init = function(){
			initView();
			initEvent();
		};

		var initView = function(){
			var visible = HAE.getData('lyric');
			that = window.open('lyric.html');
			app = that.HAE.app;
			app.setFrameless(true);
			app.setStaysOnTop(true);
			app.setShowInTaskbar(false);
			app.setTransMouseEvent(true);
			app.setTransBackground(true);
			app.setPos(100, screen.height - 200);
			app.setSize(screen.width - 200, 200);
			app.setResizable(false);
			if(visible == 'false'){
				visible = false;
			}else{
				visible = true;
			}
			app.setVisible(visible);
			menu.lyric.setChecked(visible);
			// app.show();
		};

		var initEvent = function(){
			$(audio).bind({
				timeupdate: update
			});
			$(window).bind({
				beforeunload: function(){
					app.close();
					app = null;
				}
			});
		};

		var load = function(url){
			var request;
			load = function(url){
				setText('');
				request && request.abort();
				request = $.ajax({
					url: url,
					success: function(data){
						lyrics = parse(data);
						setText('『' + song.title + '』- ' + song.artist);
					}
				});
			};
			load(url);
		};

		var play = function(){
			var request;
			play = function(){
				setText('谨以此歌送给我最爱的女朋友。——蓝飞');
				request && request.abort();
				request = $.ajax({
					url: api,
					dataType: 'json',
					data: {song_id: data.sid},
					success: function(json){
						lyrics = parse(json.lyric);
						setText('『' + song.title + '』- ' + song.artist);
					}
				});
			};
			play();
		};

		var parse = function(data){
			var re1 = /\[(.+?)\]([^\[\]]*)/g;
			var re2 = /(\d+):(\d+)\.(\d+)/;
			var tag, match, key, time, lyric;
			var lyrics = [];
			while(tag = re1.exec(data)){
				key = tag[1].trim();
				lyric = tag[2].trim();
				if(match = re2.exec(key)){
					time = match[1] * 60000 + match[2] * 1000 + match[3] * 1;
					lyrics.push({key: key, time: time, lyric: lyric});
				}
			}
			return lyrics;
		};

		var update = function(){
			var lyric;
			var time = parseInt(audio.currentTime * 1000);
			for(var i = lyrics.length - 1; i >= 0; --i){
				var item = lyrics[i];
				if(item.time <= time && item.lyric){
					lyric = item.lyric;
					// console.log(lyric);
					break;
				}
			}
			if(lyric && lyric != current){
				setText(lyric);
				current = lyric;
			}
		};

		var setText = function(text){
			var $lyric = $('#lyric', that.document);
			setText = function(text){
				$lyric.text(text);
			};
			setText(text);
		};

		var close = function(){
			app.hide();
		};

		var toggle = function(){
			var visible = ! app.isVisible();
			app.setVisible(visible);
			menu.lyric.setChecked(visible);
			HAE.setData('lyric', visible);
		};

		return {
			init: init,
			load: load,
			play: play,
			close: close,
			toggle: toggle
		};
	})();

	return {
		main: main,
		play: play
	};
})();