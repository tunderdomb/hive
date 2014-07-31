var browserify = require("gulp-browserify")
var concat = require('gulp-concat')
var gulp = require('gulp')

gulp.task("browserify", function(  ){
  gulp.src(["src/index.js"])
    .pipe(browserify({

    }))
    .pipe(concat("hive.js"))
    .pipe(gulp.dest(process.cwd()))
})

gulp.task("default", ["browserify"])

gulp.watch("src/**/*.js", ["browserify"])
