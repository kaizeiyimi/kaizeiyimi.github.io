(function($){

  var box = $('.article-share-box').eq(0);
    if (!box) {
      return;
    }

  var encodedUrl = encodeURIComponent(window.location.href);
  $('.article-share-twitter').attr('href', 'https://twitter.com/intent/tweet?url=' + encodedUrl);
  $('.article-share-facebook').attr('href', 'https://www.facebook.com/sharer.php?u=' + encodedUrl);
  $('.article-share-sinaweibo').attr('href', 'http://service.weibo.com/share/share.php?title=' + document.title + '&url=' + encodedUrl + '&searchPic=true&style=number');
  $('.article-share-wechat').attr('href', 'http://s.jiathis.com/qrcode.php?url=' + encodedUrl);

  var total = ['.article-share-twitter', '.article-share-facebook', '.article-share-sinaweibo', '.article-share-wechat']
  .reduce(function(p, c){
    return p + $(c).length;
  }, 0);
  box.css({width: total * 50}); // same in css

  // article-share
  $('body').on('click', function(){
    $('.article-share-box.on').removeClass('on');
  }).on('click', '.article-share-link', function(e){
    e.stopPropagation();

    if (box.hasClass('on')) {
      box.removeClass('on');
    } else {
      box.addClass('on');
    }
  }).on('click', '.article-share-box', function(e){
    e.stopPropagation();
  });

})(jQuery);
