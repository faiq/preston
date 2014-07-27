"use strict";

var async = require('async');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');

var restifier = require('../lib/');

module.exports = function setup(done) {
  var conn = mongoose.createConnection('mongodb://localhost:27017/testdb');
  var User = conn.model('User', new mongoose.Schema({
    name: {
      type: String,
      id: true,
      unique: true,
      required: true
    },
    password: {
      type: String,
      restricted: true
    },
    hobby: String,
    contacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    }]
  }));
  var Comment = conn.model('Comment', new mongoose.Schema({
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    reaction: {
      type: String,
      id: true,
      unique: true
    }
  }));
  var Contact = conn.model('Contact', new mongoose.Schema({
    name: String,
    enable: Boolean
  }));

  var app = express();

  restifier.reset();

  app.use(require('body-parser').json());
  app.use(restifier());

  var UserModel = restifier(User);
  var CommentModel = UserModel.submodel('comments', 'author', Comment);
  app.use(UserModel
    .use('all', function(req, res, next) {
      res.set('Middleware-All', 'true');
      next();
    })
    .use('query', function(req, res, next) {
      res.set('Middleware-Query', 'true');
      next();
    })
    .use('create', function(req, res, next) {
      res.set('Middleware-Create', 'true');
      next();
    })
    .use('get', function(req, res, next) {
      res.set('Middleware-Get', 'true');
      next();
    })
    .use('update', function(req, res, next) {
      res.set('Middleware-Update', 'true');
      next();
    })
    .use('destroy', function(req, res, next) {
      res.set('Middleware-Destroy', 'true');
      next();
    })
    .middleware());
  app.use(CommentModel.middleware());
  var server = http.createServer(app);
  server.listen(9999);

  var users = {};

  async.each(['Bob', 'Tim', 'Frank', 'Freddie', 'Asdf'], function(item, next) {
    var user = users[item] = new User({
      name: item,
      password: item + 1,
      hobby: (item === 'Tim') ? null : item + 'sledding'
    });

    // Add comments for each user
    async.series([

      function(proceed) {
        async.each(['Lol', 'test', 'asdf'], function(content, next2) {
            var comment = new Comment({
              author: user,
              content: content,
              reaction: item + content.substring(0, 1).toUpperCase()
            });
            comment.save(next2);
          },
          proceed);
      },
      function(proceed) {
        async.each(['Skype', 'Gmail', 'Website', 'ICQ'], function(contact, next3) {
          var ct = new Contact({
            name: contact
          });
          user.contacts.push(ct);
          ct.save(next3);
        }, proceed);
      },
      function(proceed) {
        user.save(proceed);
      }
    ], next);
  }, done);

  return {
    app: app,
    conn: conn,
    server: server,
    User: UserModel,
    Comment: CommentModel
  };
};
