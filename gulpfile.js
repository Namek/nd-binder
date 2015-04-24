var gulp = require('gulp'),
	merge = require('merge'),
	gutil = require('gulp-util'),
	del = require('del'),
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
}

var Filename = {
	nonMinified: 'nd-binder.js',
	minified: 'nd-binder.min.js'
};

var Path = {
	src: Folder.src + '*.js',
	nonMinified: Folder.dist + Filename.nonMinified,
	minified: Folder.dist + Filename.minified
};

function build() {
	return gulp.src(Path.src)
		.pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))

		// first output a normal version
		.pipe(concat(Filename.nonMinified))
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
