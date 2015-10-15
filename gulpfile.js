var gulp = require('gulp'),
	sass = require('gulp-sass'),
	notify = require('gulp-notify'),
	connect = require('gulp-connect'),
	browserify = require('gulp-browserify'),
	gulpif = require('gulp-if'),
	uglify = require('gulp-uglify'),
	minifyhtml = require('gulp-minify-html'),
	Bust = require('gulp-bust'),
	concat = require('gulp-concat'),
	open = require('gulp-open');

var bust = new Bust({hashLength: 8});

var config = {
	sassPath: 'src/sass',
	nodeDir: 'node_modules',
	jsPath: 'src/javascript',
	templatesPath: 'src/templates'
}

var env = process.env.NODE_ENV || 'development',
		outputDir,
		sassStyle;

if (env === 'production') {
	outputDir = 'prod';
	sassStyle = 'compressed';
}
else {
	outputDir = 'dev';
	sassStyle = 'expanded';
}

gulp.task('icons', function() {
	return gulp.src(config.nodeDir + '/font-awesome/fonts/**.*')
		.pipe(gulp.dest(outputDir + '/fonts'));
});

gulp.task('html', ['css', 'js'], function() {
	return gulp.src(config.templatesPath + '/*.html')
	.pipe(gulpif(env === 'production', minifyhtml()))
	.pipe(gulpif(env === 'production', bust.references()))
	.pipe(gulp.dest(outputDir))
	.pipe(connect.reload());
});

gulp.task('css', function() {
	return gulp.src(config.sassPath + '/style.scss')
	.pipe(sass(
		{
			includePaths: [ config.nodeDir + '/bootstrap-sass/assets/stylesheets', config.nodeDir + '/font-awesome/scss' ],
			outputStyle: sassStyle,
			precision: 10
		}
	))
	.pipe(gulpif(env === 'production', bust.resources()))
	.pipe(gulp.dest(outputDir + '/css'))
	.pipe(connect.reload());
});

gulp.task('js', function() {
	return gulp.src(config.jsPath + '/app.js')
	.pipe(concat('scripts.js'))
	.pipe(browserify())
	.pipe(gulpif(env == 'production', uglify()))
	.pipe(gulpif(env === 'production', bust.resources()))
	.pipe(gulp.dest(outputDir + '/js'))
	.pipe(connect.reload());
});

gulp.task('pwebcheckout-plugin', function() {
	return gulp.src('src/pwebcheckout-plugin/**/*')
	.pipe(gulp.dest(outputDir + '/pwebcheckout-plugin'));
});

gulp.task('connect', function() {
	connect.server({
		root: outputDir,
		port: 1234,
		livereload: true
	});
});

gulp.task('watch', ['connect'], function() {
	gulp.watch(config.sassPath + '/**/*.scss', ['css']);
	gulp.watch(config.jsPath + '/**/*.js', ['js']);
	gulp.watch(config.templatesPath + '/*.html', ['html']);
});

gulp.task('open', ['html', 'connect', 'watch'], function() {
	gulp.src(outputDir + '/index.html')
	.pipe(open({uri: 'http://localhost:1234'}));
});

gulp.task('default', ['icons', 'css', 'pwebcheckout-plugin', 'js', 'html', 'connect', 'watch', 'open']);
