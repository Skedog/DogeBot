function getUrlVars() {
    var vars = [], hash;
    if (window.location.href.indexOf('#')) {
    	var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1).split('&');
    } else {
    	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    };
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
};

function readCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

userDetails = decodeURIComponent(readCookie("userDetails")).split(',');
if (typeof userDetails[2] != 'undefined') {
	$.ajax({
		url: '/loggedinnav',
		type: 'GET',
		success: function(data) {
			$('.navbar-nav').html(data);
		}
	});
} else {
	$.ajax({
		url: '/nav',
		type: 'GET',
		success: function(data) {
			$('.navbar-nav').html(data);
		}
	});
};