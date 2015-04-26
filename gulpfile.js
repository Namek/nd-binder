var gulp = require('gulp'),
	merge = require('merge'),
	gutil = require('gulp-util'),
	del = require('del'),
	addSrc = require('gulp-add-src'),
	tap = require('gulp-tap'),
	pathEndsWith = require('path-ends-with'),
	header = require('gulp-header'),
	footer = require('gulp-footer'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	plumber = require('gulp-plumber'),
	jshint = require('gulp-jshint'),
	uglify = require('gulp-uglify'),
	watch = require('gulp-watch'),
	livereload = require('gulp-livereload'),
	size = require('gulp-size');

var Folder = {
	src: 'src/',
	dist: 'dist/'
};

var Filename = {
	nonMinified: 'nd-binder.js',
	minified: 'nd-binder.min.js'
};

var Path = {
	src: Folder.src + '*.js',
	parser: 'js_expr/dist/js_expr.js',
	nonMinified: Folder.dist + Filename.nonMinified,
	minified: Folder.dist + Filename.minified
};

function build() {
	return gulp.src(Path.src)
		.pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))

		// append expression parser
		.pipe(addSrc.append(Path.parser))
		.pipe(tap(function(file) {
			if (pathEndsWith(file.path, Path.parser)) {
				file.contents = Buffer.concat([
					new Buffer('nd.utils.$expr=(function(){var module={};'),
					file.contents,
					new Buffer('return module.exports;})();')
				]);
			}
		}))

		// concatenate all files
		.pipe(concat(Filename.nonMinified))

		// enclose whole framework in 'ndBinder' scope
		.pipe(header('var ndBinder = (function() {var nd = {};'))
		.pipe(footer('return nd;})();'))

		// first output a normal version
		.pipe(gulp.dest(Folder.dist))
		.pipe(size({ title: 'non-uglified' }))

		// and then the uglified version
		.pipe(rename({ extname: '.min.js' }))
		.pipe(uglify())
		.pipe(gulp.dest(Folder.dist))
		.pipe(size({ title: 'uglified' }))
		.pipe(size({ title: 'uglified', gzip: true }));
}

gulp.task('build-only', build);
gulp.task('build', ['clean', 'build-only']);

gulp.task('watch', ['build'], function() {
	watch(Path.src, {verbose: true}, function() {
		gulp.run('build-only');
	});

	livereload.listen();
	gulp.watch([Path.minified, Path.nonMinified]).on('change', livereload.changed);
});

gulp.task('clean', function(cb) {
	del(Folder.dist, cb);
});

gulp.task('default', ['build']);
