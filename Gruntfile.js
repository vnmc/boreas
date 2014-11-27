module.exports = function(grunt)
{
	///////////////////////////////////////////////////
	// Configure Project

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		typescript: {
			base: {
				src: 'src/*.ts',
				dest: 'lib',
				options: {
					basePath: 'src',
					module: 'commonjs',
					target: 'es3'
				}
			},

			watch: {
				src: 'src/*.ts',
				dest: 'lib',
				options: {
					basePath: 'src',
					module: 'commonjs',
					target: 'es3',
					watch: true
				}
			}
		},

		tslint: {
			options: {
				configuration: grunt.file.readJSON('tslint.json'),
				rulesDirectory: 'tools/tslint-rules'
			},
			base: {
				src: 'src/*.ts'
			}
		}
	});


	///////////////////////////////////////////////////
	// Load Plugins

	grunt.loadNpmTasks('grunt-typescript');
	grunt.loadNpmTasks('grunt-tslint');


	///////////////////////////////////////////////////
	// Register Tasks

	grunt.registerTask(
		'watch',
		'Watch for TypeScript changes',
		[ 'typescript:watch' ]
	);

	grunt.registerTask(
		'default',
		'Compile source files',
		[ 'tslint', 'typescript:base' ]
	);
};