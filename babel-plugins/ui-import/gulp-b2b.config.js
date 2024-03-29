/*
 * @Author: yquanmei
 * @Date: 2022-07
 * @LastEditors: yquanmei
 * @LastEditTime: 2022-09
 * @FilePath: /learn-demo/babel-plugins/ui-import/gulp-b2b.config.js
 * @Description:
 * Copyright (c) 2022 by 用户/公司名, All Rights Reserved.
 */

const gulp = require("gulp");
const babel = require("gulp-babel");
gulp.task("babel", () =>
  gulp
    // .src("src/**/*.js")
    .src("plugin/b2b/es/*.js")
    .pipe(
      babel({
        plugins: ["@babel/plugin-transform-modules-commonjs"],
      })
    )
    .pipe(gulp.dest("plugin/b2b/lib"))
);
gulp.series("babel")();
