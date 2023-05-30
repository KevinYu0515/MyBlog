$(window).scroll(function(){
    /*當瀏覽器捲軸往下捲100px*/
    const px = 100;
    if (document.body.scrollTop > px || document.documentElement.scrollTop > px) {
        $(".btn-moveTop").attr('style', 'display: block')
        $(".btn-bred").attr('style', 'display: block')/*顯示*/
    } else {
        $(".btn-moveTop").attr('style', 'display: none')
        $(".btn-bred").attr('style', 'display: none')/*隱藏*/
    }
});

$(".btn-moveTop").click(function(e){
    e.preventDefault();
    $("html,body").animate(
        {
        scrollTop: 0,
        },
        600
    );
})