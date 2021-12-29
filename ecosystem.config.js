module.exports = {
	apps : [
		{
			name: "Botato",
			script: "node dist/index.js",
			ignore_watch: ["node_modules"],
			error_file: "~/logs/botato-err.log",
			out_file: "~/logs/botato-out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss"
		},
		{
			name: "Lavalink",
			script: "lavalink.sh",
			interpreter: "/bin/bash",
			error_file: "~/logs/lavalink-err.log",
			out_file: "~/logs/lavalink-out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss"
		}

	]
}
