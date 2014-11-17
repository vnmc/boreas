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
					target: 'es5'
				}
			},

			watch: {
				src: 'src/*.ts',
				dest: 'lib',
				options: {
					basePath: 'src',
					module: 'commonjs',
					target: 'es5',
					watch: true
				}
			}
		},

		tslint: {
			options: {
				configuration: grunt.file.readJSON('tslint.json'),
				rulesDirectory: 'tools/tslint-rules'
			},
			files: [ 'src/*.ts' ]
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
		[ 'typescript:base', 'tslint' ]
	);
};