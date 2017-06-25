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

setTimeout(function() {
    if ($( window ).width() < 767) {
        $('.datatable').DataTable().destroy();
    }
}, 100);
$( window ).resize(function() {
    if ($( window ).width() > 767) {
        // if (!$.fn.DataTable.isDataTable('.datatable')) {
            $('.datatable').DataTable().destroy();
            $('.datatable').DataTable({
                "lengthMenu": [[25, 50, -1], [25, 50, "All"]]
            });
        // } else {}
    } else {
        $('.datatable').DataTable().destroy();
    }
});

function loadSonglist(data,page) {
    $.ajax({
        url: '/getsonglist',
        data: data,
        type: 'POST',
        success: function(data) {
            if (data != '') {
                var contentData = '';
                $('.datatable').DataTable().destroy();
                $.each(data, function(key, value) {
                    if (key == 0) {
                        $('.currentsong').html('<strong>Song Title:</strong> ' + data[0]['songTitle'] + '<br><strong>Requested By:</strong> ' + data[0]['whoRequested']);
                    }
                    if (page == 'moderation') {
                        contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td><td>' + data[key]['whoRequested'] + '</td><td><input type="button" value="Remove" id="' + data[key]['songID'] + '" class="removeButton" /></td></tr>';
                    } else {
                        contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td><td>' + data[key]['whoRequested'] + '</td></tr>';;
                    };
                });
                $('.datatable tbody').html(contentData);
                $('.datatable').DataTable({
                    "lengthMenu": [[5, 25, 50, -1], [5, 25, 50, "All"]]
                });
                $('.datatable').show();
            } else {
                $('.datatable tbody').hide();
                $('.moderation-songlist').html("Currently no songs in the queue!");
            };
        }
    });
}