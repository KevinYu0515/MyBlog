let lastScrollTop = 0
const isDev = true
const px = 100

const labels = {
    "python": [190, 220, 254, 211.9, 97, 87.1],
    "javascript": [255, 222, 130, 44.2, 100, 75.5],
    "git": [255, 155, 113, 17.7, 100, 72.2],
    "crawler": [24, 53, 36, 143.5, 37.4, 38.8],
    "front-end": [234, 154, 178, 342, 65.6, 76.1],
    "back-end": [129, 83, 85, 357.4, 21.7, 41.6],
    "hugo": [238, 75, 106, 348.6, 82.7, 61.4],
    "chatbot": [171, 146, 191, 273.3 ,26.0 ,66.1],
    "life record": [202, 255, 208, 126.8, 100, 89.6],
    "react": [63, 132, 229, 215, 72.5, 89.8],
    "web": [187, 68, 48, 9, 74, 73],
    "webpack": [121, 139, 238, 231, 49.2, 93.3],
    "information security": [2, 8, 135, 237, 98.5, 52.9],
    "forensics": [199, 232, 243, 195, 18.1, 95.3],
    "ctf": [255, 126, 107, 8, 58, 100],
    "react native":[41, 231, 205, 172, 80, 53],
    "cloud":[235, 245, 238, 138, 33, 94],
    "aws":[249, 137, 72, 22, 94, 63],
    "setup":[20, 15, 45, 250, 50, 12]
}

const lightness_threshold = 0.453
const border_threshold = 0.96

$(document).ready(() => {
    $(window).scroll(function(){
        // 瀏覽進度條
        if(isDev){
            const px = $(window).height();
            var view = ($(window).scrollTop()) / ($(document).height() - $(window).height()) * 100 + 'vw'
            $(".view-bar").width(view)
        }

        // 向上滾動時按鈕顯示
        var st = window.pageYOffset || document.documentElement.scrollTop
        if (window.pageYOffset > px &&  st < lastScrollTop) {
            $(`[aria-label="回到頂部"]`).addClass("btn-moveTop-animate")
        } else {
            $(`[aria-label="回到頂部"]`).removeClass("btn-moveTop-animate")
        }
        lastScrollTop = st <= 0 ? 0 : st
    })

    // 回到頂部
    $(".btn-moveTop").click(function(e){
        e.preventDefault();
        $("html,body").animate({scrollTop: 0}, 600)
    })

    // 標籤顏色分類
    $(`[class="tag"]`).each((index, item) => {
            const text = item.innerText.toLowerCase()
            const [label_r, label_g, label_b, label_h, label_s, label_l] = labels[text]
            const perceived_lightness = (label_r * 0.2126 + label_g * 0.7152 + label_b * 0.0722) / 255 
            const lightness_switch = Math.max(0, Math.min((1 / (lightness_threshold - perceived_lightness)), 1))
            const border_alpha = Math.max(0, Math.min((perceived_lightness - border_threshold) * 100, 1))
            item.style.color = `hsl(0deg, 0%, calc(${lightness_switch} * 100%))`
            item.style.background = `rgb(${label_r}, ${label_g}, ${label_b})`
            item.style["border-color"] = `hsla(${label_h}, calc(${label_s} * 1%), calc(${label_l} - 25) * 1%), ${border_alpha})`
            item.style["font-weight"] = 500
            item.style.border = "1px solid transparent"
            item.style["font-family"] = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans"`
    })

    // 下拉式程式區塊 shortcode 語法
    $(".code").each((index, element) => {
        $(`[aria-label=${element.ariaLabel}] .title`).click(() => {
            $(`[aria-label=${element.ariaLabel}] .title`).toggleClass("click")
            $(`[aria-label='${element.ariaLabel}'] .content`).slideToggle()
        })
    })

})

