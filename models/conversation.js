var Conversation = Composer.RelationalModel.extend({
	base_url: '/conversations',

	relations: {
		recipients: { collection: 'Recipients' },
		messages: { collection: 'Messages' }
	},

	polling: false,

	init: function()
	{
		this.bind('change:id', this.poll.bind(this));
	},

	send: function(message)
	{
		if(this.is_new())
		{
			var data = this.toJSON();
			delete data.messages;
			data.message = message.toJSON();
			return app.api.post(this.get_url(), data, {})
				.bind(this)
				.then(function(res) {
					this.set(res);
				});
		}
		else
		{
			return app.api.post(this.get_url()+'/messages', message.toJSON(), {})
				.bind(this)
				.then(function(res) {
					this.get('messages').add(res);
				});
		}
	},

	poll: function()
	{
		if(!this.id(true))
		{
			this.polling = false;
			return;
		}
		this.polling = true;

		var last_id = this.get('messages').toJSON()
			.reduce(function(acc, x) { if(x.id > acc) { return x.id; } return acc; }, 0);
		return app.api.get(this.get_url()+'/new', {}, {getvars: {last_id: last_id}})
			.bind(this)
			.then(function(messages) {
				if(!this.polling) return;
				this.get('messages').upsert(messages);
			})
			.catch(function(err) {
				if(err && err.msg == 'timeout') return;
				log.error('conversation: poll: ', derr(err));
			})
			.finally(function() {
				if(!this.polling) return;
				this.poll();
			});
	}
});

var Conversations = Composer.Collection.extend({
	url: '/conversations',
	model: Conversation
});

