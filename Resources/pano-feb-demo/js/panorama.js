/*
 *   Views
 */
var HomeView = Backbone.View.extend({
    el : '#page',
    tpl : $('#home-template').html(),
    render : function() {
        this.$el.html(this.tpl);
        setTimeout(function() {
             $('.splash', this.$el).fadeOut(1000, function() {
                router.navigate('welcome', {trigger : true});
            });
        }, 5000);
    }
});

var WelcomeView = Backbone.View.extend({
    el : '#page',
    tpl : $('#welcome-template').html(),
    events : {
        'click a.start-demo' : 'pageTransition'
    },
    render : function() {
        this.$el.html(this.tpl);
        this.showContent();
    },
    pageTransition : function(e) {
        e.preventDefault();

        $(e.currentTarget).addClass('active');

        $('.welcome').fadeOut(500, function() {
            router.navigate('questions', {trigger : true});
        });
    },
    showContent : function() {

        var index = 0,
            numItems = $('#page .effect').length,
            effect = 'flipInX';

        function reveal() {

            var $item = $('#page .effect:eq('+index+')');

            if ($item.prop('tagName') == 'A') {
                $item.css({'display':'inline-block'});
            }
            else {
                $item.css({'display':'block'});
            }

            $item.addClass('animated ' + effect);

            index++;

            if (index != numItems) {
                setTimeout(function() {
                    reveal();
                }, 1000);
            }

        }

        // start the loop
        reveal();

    }

});


var QuestionsView = Backbone.View.extend({
    el : '#page',
    tpl : $('#questions-template').html(),
    render : function() {

        var template = _.template(this.tpl, {questions : appQuestions});

        // load the template
        this.$el.html(template);

        // fade in the content
        $('.content').fadeIn();

        // reveal the content
        this.showQuestions();

    },
    events : {
        'click #content .question-list a' : 'loadData'
    },

    showQuestions : function() {

        var index = 0,
            numQuestions = $('.question-list ul li').length;

        $('.questions header').addClass('animated fadeInDown');

        function show() {

            var $question = $('.question-list ul li:eq('+index+')');

            $question.css({'display':'block'}).addClass('animated fadeInDown');

            setTimeout(function() {
                $question.removeAttr('class');
            }, 1000);

            index++;

            if (index == numQuestions) {
                return;
            }

            setTimeout(function () {
                show();
            }, 100);
        }

        setTimeout(function() {
            $('.questions header').removeAttr('style');
            show();
        }, 500);

    },

    loadData : function(e) {

        e.preventDefault();

        var link  = e.currentTarget,
            self  = this,
            index = 1,
            numItems,
            answerPos;

        answerPos = $(link).offset();

        $(link).parent().addClass('active');

        $('.questions header').removeAttr('class').animate({'opacity':0});

        numItems = $('.questions li').not('.active').length;

        $('.questions li').not('.active').animate({'opacity':0}, function(e) {
            if (index == numItems) {
                $(link).addClass('absolute').css({'display':'block', 'top' : answerPos.top}).animate({'top' : '120px'}, 500, function() {
                    var id = $(this).attr('data-id');
                    router.navigate('answers/' + id, {trigger : true});
                });
            }
            else {
                index++;
            }
        });

    },

});


var AnswersView = Backbone.View.extend({
    el : '#page',
    tpl : $('#answers-template').html(),

    events : {
       'click #question-actions .new-question' : 'stopTimer',
       'click #question-actions .modal'  : 'showModal'
    },

    render : function(id) {

        var self = this,
            answers = appQuestions[id],
            template;

        template = _.template(this.tpl, {answer : answers});
        this.$el.html(template);
        this.revealAnswer();

        if (id == 1) {
            this.showNotification = true;
            setTimeout(function() {
                self.interrupt();
            }, 13000);
        }

    },

    showNotification : false,

    stopTimer : function() {
        this.showNotification = false;
        APP.chicklet.stopTimer();
    },

    showChicklets : function(fn) {

        function showChicklet() {

            // select one at random 0 through array length-1
            var randomNum = Math.floor((Math.random() * chicklets.length)),
                timer = Math.floor((Math.random() * 750)),
                $chicklet;

            $chicklet = $(chicklets[randomNum]);

            // reveal it
            $chicklet.parent().find('.spinner').addClass('fade').fadeOut(function() {
                $chicklet.css({'display':'block'}).addClass('pop');
            });

            // delete if from array
            chicklets.splice(randomNum, 1);

            // callback
            if (chicklets.length === 0) {
                if (fn) {
                    fn();
                }
                return;
            }

            // reveal the next icon
            setTimeout(function() {
                showChicklet();
            }, timer);

        }

        $('#page .chicklet.disabled').each(function() {
            var self = this;
            $(this).parent().find('.spinner').addClass('fade').fadeOut(function() {
                $(self).fadeIn(250);
            });
        });

        var chicklets  = [];

        $('#page .chicklet').each(function() {
            if (!$(this).hasClass('disabled')) {
                chicklets.push(this);
            }
        });

        // show sources
        showChicklet();

    },

    revealAnswer : function() {

        var self = this;

        $('.data-sources ul li').delay(750).fadeIn(250);

        setTimeout(function() {

            self.showChicklets(function() {

                setTimeout(function() {
                    $('.answer, #question-actions').slideDown();
                }, 500);

                APP.chicklet.autoUpdate.startTimer();

            });

        }, 1000);

        $('#data-sources').fadeIn(250, function() {
            $('#data-sources ul').animate({'width':'706px'});
        });

    },

    showModal : function(e) {
        e.preventDefault();
        APP.modal.open();
    },

    loadInterruptData : function() {

        var $fit = $('.chicklet.icon-fit-bit');

        $('#data-sources .fitbit').animate({'opacity':1});

        $fit.fadeOut(250,function() {

            $fit.prev().removeClass('fade').fadeIn(function() {

                $(this).delay(1000).fadeOut(function() {
                    $fit.css({'display':'block'}).removeClass('disabled').addClass('pop');

                    $('.answer-con .answer:eq(0)').delay(500).slideUp(500, function() {
                        $('div:eq(0)', this).html(appQuestionUpdate);
                        $(this).slideDown();
                        // $fit.after('<div class="spinner small" />');
                        // $('.spinner.small').delay(2500).fadeIn().delay(2500).fadeOut(function() {
                        //     $(this).remove();
                        // });
                    });

                });

            });

        });

    },

    interrupt : function() {

        if (!this.showNotification) {
            return;
        }

        var self = this,
            noti = '<span class="animated fadeInRight icon-fit-bit"></span><span class="msg animated fadeIn">FitBit connected</span>',
            text = 'Tap to load<br />FitBit data.';

        $('#hdr').append('<div id="notification" class="hidden" />');

        $('#notification').slideDown(function() {
            $('#notification').html(noti);

            setTimeout(function() {
                $('#notification .msg').removeClass('aniamted').removeClass('fadeIn').animate({opacity:0}, 500, function() {
                    $(this).html(text).animate({opacity:1});
                });
            }, 3000);

        });

        $('#notification').click(function() {
            self.loadInterruptData();
            $(this).fadeOut(function() {
                $(this).remove();
            });
        });

    }

});

// delcare views
var home      = new HomeView();
var welcome   = new WelcomeView();
var questions = new QuestionsView();
var answers   = new AnswersView();


/*
 *   Routes
 */
var Router = Backbone.Router.extend({
    routes : {
        ''           : 'home',
        'welcome'    : 'welcome',
        'questions'  : 'questions',
        'answers/:id' : 'answers',
    }
});

/* Router */
var router = new Router();

// list for routes
router.on('route:home', function() {
    home.render();
});

router.on('route:welcome', function() {
    welcome.render();
});

router.on('route:questions', function() {
    questions.render();
});

router.on('route:answers', function(id) {
    answers.render(id);
});


// tell backbone to listen to the url
Backbone.history.start();


// init fast click
window.addEventListener('load', function () {
    FastClick.attach(document.body);
}, false);