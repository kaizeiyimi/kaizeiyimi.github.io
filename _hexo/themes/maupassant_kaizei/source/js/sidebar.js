(function($){
  var delay = function(func, threshold, execAsap) {
    var timeout;
    return function debounced() {
      var obj = this, args = arguments;

      if (execAsap) {
        clearTimeout(timeout);
        func.apply(obj, args);
      } else if (!timeout) {
        timeout = setTimeout(function() {
          func.apply(obj, args);
          timeout = null;
        }, threshold || 100);
      }
    };
  };

  var sidebarContainer = $('#sidebar-container'),
    parent = sidebarContainer.parent();
  var lastOffset;

  $(window).scroll(layout);
  $(window).resize(layout);

  function layout() {
    var currentOffset = $(window).scrollTop();
    if (!lastOffset) {
      lastOffset = currentOffset;
    }
    var diff = currentOffset - lastOffset;
    lastOffset = currentOffset;

    var sidebarContainerHeight = sidebarContainer.outerHeight(),
      parentTop = parent.offset().top;

    sidebarContainer.css({
      left: parent.offset().left,
      width: parent.width()
    });

    // layout
    if (currentOffset <= parentTop
      || sidebarContainerHeight >= parent.height()) {
      sidebarContainer.css({top: parentTop - currentOffset});
      return;
    }

    var bottomDistance = 40, //$(document).height() - (parentTop + parent.height()),
      targetTop = (parseInt(sidebarContainer.css('top')) || 0) - diff,
      targetBottom = targetTop + sidebarContainerHeight;

    if (diff > 0) {
      var windowHeight = $(window).height();
      if (windowHeight >= sidebarContainerHeight) {
        sidebarContainer.css({top: 0});
      } else if (targetBottom >= windowHeight - bottomDistance) {
        sidebarContainer.css({top: targetTop});
      }
    } else {
      if (targetTop <= 0) {
        sidebarContainer.css({top: targetTop});
      }
    }

  };

})(jQuery);