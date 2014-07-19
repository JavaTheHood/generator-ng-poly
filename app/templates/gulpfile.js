'use strict';

var gulp = require('gulp')
  , addSrc = require('gulp-add-src')
  , coffeelint = require('gulp-coffeelint')
  , connect = require('gulp-connect')
  , inject = require('gulp-inject')
  , jade = require('gulp-jade')
  , jshint = require('gulp-jshint')
  , less = require('gulp-less')
  , open = require('gulp-open')
  , plato = require('gulp-plato');

var _ = require('lodash')
  , karma = require('karma').server
  , path = require('path')
  , rimraf = require('rimraf');

// bower assets to be inject into index.html
// 'bower_components' is automatically prepended
var injectableBowerComponents = [
  'angular/angular.js',
  'angular-ui-router/release/angular-ui-router.js',
  'platform/platform.js'
];

// bower polymer components that do not need to injected into index.html
// 'bower_components' is automatically prepended
var bowerPolymerComponents = [
  'polymer/polymer.{js,html}',
  'polymer/layout.html'
];

// src files
var componentsBase = 'src/components/'
  , componentsDir = componentsBase + '**/'
  , componentsMarkup = componentsDir
  , componentsJs = componentsDir + '*.js'
  , componentsLess = componentsDir + '*.less'
  , srcMarkup = 'src/**/'
  , srcMarkupTemplates = 'src/**/*Directive.{jade,html}' // used for karmaConf
  , srcJsFiles = 'src/**/*.js'
  , srcLessFiles = 'src/**/*.less'; // since we need to strictly specify style.less later

// test files
var unitTests = 'src/**/*_test.{coffee,js}';

// build files
var build = 'build/'
  , buildComponents = build + 'components/'
  , buildCss = build
  , buildJs = build;

var bowerDir = 'bower_components/';
function prependBowerDir(file) {
  return bowerDir + file;
}

var karmaConf = {
  browsers: ['PhantomJS'],
  frameworks: ['jasmine'],
  files: [
    'bower_components/angular/angular.js',
    'bower_components/angular-ui-router/release/angular-ui-router.js',
    'bower_components/angular-mocks/angular-mocks.js',
    srcJsFiles,
    unitTests,
    srcMarkupTemplates
  ],
  reporters: ['failed', 'coverage'],
  preprocessors: {
    'src/**/!(*_test)+(.js)': ['coverage'],
    'src/*Directive.html': ['ng-html2js'],
    'src/**/*Directive.jade': ['ng-jade2js'],
    'src/**/*_test.coffee': ['coffee']
  },
  ngHtml2JsPreprocessor: {
    stripPrefix: 'src/'
  },
  ngJade2JsPreprocessor: {
    stripPrefix: 'src/'
  },
  singleRun: true
};

gulp.task('clean', function (cb) {
  return rimraf('build', cb);
});

gulp.task('components', ['clean', 'jshint'], function () {
  gulp.src(componentsJs, {
      base: componentsBase
    })
    .pipe(gulp.dest(buildComponents));

  gulp.src(componentsLess, {
      base: componentsBase
    })
    .pipe(less())
    .pipe(gulp.dest(buildComponents));

  return gulp.src(componentsMarkup + '*.jade', {
      base: componentsBase
    })
    .pipe(jade())
    .pipe(addSrc(componentsMarkup + '*.html'))
    .pipe(gulp.dest(buildComponents));
});

gulp.task('connect', function () {
  connect.server({
    root: build,
    port: 8080,
    livereload: true
  });
});

gulp.task('inject', ['js', 'less', 'markup', 'components'], function () {
  return gulp.src(build + 'index.html')
    .pipe(inject(gulp.src([
      buildComponents + '**/*.html',
      buildCss + '**/*.css',
      buildJs + 'angular.js',
      buildJs + 'angular-ui-router.js',    
      buildJs + '**/*.js'
      ], { read: false }), {
        addRootSlash: false,
        ignorePath: build
    }))
    .pipe(gulp.dest(build))
    .pipe(connect.reload());
});

gulp.task('js', ['clean', 'jshint'], function () {
  return gulp.src([
      srcJsFiles,
      '!**/*_test.*'
    ].concat(injectableBowerComponents.map(prependBowerDir)))
    .pipe(gulp.dest('build'));
});

gulp.task('coffeelint', function () {
  return gulp.src([
    unitTests,
    '!**/*_test.js'
    ])
    .pipe(coffeelint())
    .pipe(coffeelint.reporter())
    .pipe(coffeelint.reporter('fail'));
});

gulp.task('jshint', function () {
  return gulp.src([
    componentsJs,
    srcJsFiles,
    unitTests,
    '!**/*_test.coffee'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
    .pipe(plato('report'));
});

gulp.task('less', ['clean'], function () {
  return gulp.src(srcLessFiles)
    .pipe(less())
    .pipe(gulp.dest(buildCss));
});

gulp.task('markup', ['clean'], function () {
  return gulp.src(srcMarkup + '*.jade')
    .pipe(jade())
    .pipe(addSrc(srcMarkup + '*.html'))
    .pipe(gulp.dest(build));
});

gulp.task('open', function () {
  // A file must be specified as the src when running options.url or gulp will overlook the task.
  return gulp.src('Gulpfile.js')
    .pipe(open('', {url: 'http://localhost:8080'}));
});

gulp.task('polymer', ['inject'], function () {
  return gulp.src(bowerPolymerComponents.map(prependBowerDir), {
      base: bowerDir
    })
    .pipe(gulp.dest(buildComponents));
});

gulp.task('build', ['polymer']);

gulp.task('default', ['build'], function () {
  gulp.start('connect');
  gulp.start('open');
  gulp.start('watch');
});

gulp.task('test', ['jshint', 'coffeelint'], function (done) {
  karma.start(_.assign({}, karmaConf), done);
});

gulp.task('watch', function () {
  gulp.watch([unitTests], ['test']);
  gulp.watch([srcMarkup + '*.{html,jade}', srcJsFiles, srcLessFiles, componentsDir + '*.{html,jade,js,less}'], ['build']);
});