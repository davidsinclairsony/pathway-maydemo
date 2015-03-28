var APP = APP || {};

APP.timeout = {

    time : 0,

    timer : function () {

        this.time++;

        if (this.time == 60) {

            $('#page').fadeOut(function() {
                router.navigate('', {trigger : true});
                $(this).fadeIn();
                APP.timeout.time = 0;
                APP.modal.close();
            });

        }

        setTimeout(function() {
            APP.timeout.timer();
        }, 1000);

    },

    bindEvents : function() {

        var self = this;
        $('body').on('click', function() {
            self.time = 0;
        });

    },

    init : function() {
        this.timer();
        this.bindEvents();
    }

};

APP.modal = {

    tpl : $('#modal-template').html(),

    open : function() {

        if (document.getElementById('modal')) {
            return;
        }

        $('body').append(this.tpl);

        this.bindEvents();

        $('#modal').css({'display':'block'}).addClass('animated fadeInDown');
    },

    close : function() {

        this.unbindEvents();

        $('#modal').removeClass('animated').removeClass('fadeInDownBig').addClass('animated').addClass('fadeOutDown');
        $('#modal-overlay').fadeOut(function() {
            $(this).remove();
        });

        setTimeout(function() {
            $('#modal').remove();
        }, 500);

    },

    bindEvents : function() {

        var self = this;
        $('#modal .close').on('click', function(e) {
            e.preventDefault();
            self.close();
        });

    },

    unbindEvents : function() {
        $('#modal .close').off('click');
    }

};

APP.alert = function(msg) {

    var alert = $('#alert-template').html();

    var tpl = _.template(alert, {msg:msg});

    $('body').append(tpl);

    $('#alert a.btn').on('click', function(e) {
        e.preventDefault();
        $('#alert, #modal-overlay').remove();
    });


};

APP.chicklet = {

    autoUpdate : {

        isRunning : false,

        dataSources : [1,2,3,7],

        time : 0,

        interval : 20000,

        refresh : function() {

            if (!this.isRunning) {
                return;
            }

            var self = this;

            for (var index in this.dataSources) {

                var i = self.dataSources[index] + 1;

                if ( !$('#icons li:eq('+i+') .chicklet').hasClass('disabled') ) {
                    if ($('#icons li:eq('+i+') .spinner.small').length > 0) {
                        $('#icons li:eq('+i+') .spinner.small').remove();
                    }
                    $('#icons li:eq('+i+')').append('<div class="spinner small" />');
                }
            }

            setTimeout(function() {
                $('#icons .spinner.small').fadeIn();
            }, 2500);

            setTimeout(function() {
                $('#icons .spinner.small').fadeOut(function() {
                    $(this).remove();
                });
            }, 5500);

            setTimeout(function() {
                self.refresh();
            }, self.interval);

        },

        startTimer : function() {
            if (this.isRunning == true) {
                $('#icons .spinner.small:visible').fadeOut(250);
                this.time = 0;
                return;
            }
            var self = this;
            this.isRunning = true;
            setTimeout(function() {
                self.refresh();
            }, this.interval);
        },

        stopTimer : function() {
            this.isRunning = false;
        }

    }

};


$(function () {
    APP.timeout.init();

    // prevent the screen from scrolling
    document.ontouchmove = function(event){
        event.preventDefault();
    }

});