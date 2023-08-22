function generateCatalog(selector) {
    _containerSelector = 'div.post-container'

    // init
    var P = $(_containerSelector), a, n, t, l, i, c;
    a = P.find('h1,h2,h3,h4,h5,h6');
    // clean
    $(selector).html('')

    // appending
    a.each(function (index, item) {
        n = $(this).prop('tagName').toLowerCase();
        i = "#" + $(this).prop('id');
        t = $(this).text();
        c = $(`<a aria-label="${t}" href="${i}" rel="nofollow">${t}</a>`);
        l = $(`<li class="${n}_nav"></li>`).append(c);
        $(selector).append(l);
    });
    return a;
}

$(document).ready(() => {
    if(!window.location.href.includes("post")) return 
    const sideElements = generateCatalog(".catalog-body");
    const all_htags = []
    let firstTag = null
    sideElements.each((index, element) => {
        const name = element.id
        const innerTagsCount = 0
        const sideElement = $(`[aria-label="${element.innerText}"]`)
        const top =  $(`[id="${name}"]`).offset().top
        const htag = sideElement.parent()
        const innerTags = htag.nextUntil(`[class="${htag[0].className}"]`)

        let innerFirstTag = null, i = 0
        while(!innerFirstTag && i < innerTags.length){
            if(innerTags[i].className > htag[0].className) innerFirstTag = innerTags[i].className
            i++
        }

        const tagName = $(`[id="${name}"]`).prop("tagName")
        if(!firstTag) firstTag = tagName
        if(tagName !== firstTag) sideElement.hide()
        all_htags.push({ sideElement, innerTags, innerFirstTag, innerTagsCount, top, tagName })
    })

    let count = [0, 0, 0, 0, 0]
    for(let i = all_htags.length - 1; i >= 0; i--){
        const index = parseInt(all_htags[i].tagName.slice(-1))
        all_htags[i].innerTagsCount = 1
        count[index - 1] += 1
        for(let j = index; j < 5; j++){
            all_htags[i].innerTagsCount += count[j]
            count[index - 1] += count[j]
            count[j] = 0
        }
    }

    $(window).scroll(() => {
        let curPos = window.pageYOffset + 5
        let isBottom = Math.abs(curPos + document.documentElement.clientHeight - document.documentElement.scrollHeight) < 5
        all_htags.forEach((item, index) => {
            const {sideElement, innerTags, innerFirstTag, innerTagsCount, top, tagName} = item
            if(index < all_htags.length - 1){
                if(innerTagsCount > 1){
                    if(curPos >= top && curPos < all_htags[index + innerTagsCount].top && !isBottom){
                        sideElement.attr("style", "color: #337ab7")
                        innerTags.filter((index, tag) => tag.className === innerFirstTag).slideDown()
                    }
                    else{
                        sideElement.removeAttr("style", "color")
                        innerTags.filter((index, tag) => tag.className === innerFirstTag).slideUp()
                    }
                }else{
                    if(curPos >= top && curPos < all_htags[index + innerTagsCount].top && !isBottom) sideElement.attr("style", "color: #337ab7")
                    else sideElement.removeAttr("style", "color")
                }
            }else{
                if(curPos >= top || isBottom) sideElement.attr("style", "color: #337ab7")
                else sideElement.removeAttr("style", "color")
            }
        })
    })

    // toggle side catalog
    $(".catalog-toggle").click((function (e) {
        e.preventDefault();
        $('.side-catalog').toggleClass("fold")
    }))
    console.log("Hi")
})