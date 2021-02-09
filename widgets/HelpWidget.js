/** jToxKit - chem-informatics multi-tool-kit.
 * A generic widget for providing help from the server
 *
 * Author: Nina Jeliazkova
 * Copyright © 2021, IDEAConsult Ltd. All rights reserved.
 *
 */

jT.HelpWidget = function (settings) {
	$.get(settings.baseUrl + "chelp/" + (settings.topic || "") + "?media=text/html", function (data) {

		$(settings.target).append(data);
		$('#keys>ul>li>a').map(function () {
			var title = $(this).text(),
				itemIds = $(this).attr('href').match(/^#(\w+)/);

			if (!itemIds) return;
			var content = $(itemIds[0]).html(),
				key = itemIds[1];

			$('a.chelp.' + key)
				.attr('title', 'Click for more detailed help on ' + title)
				.html('<sup class="helper"><span class="fa fa-action fa-info-circle"></span></sup>')
				.click(function () {
					$('#htlp-title').text(title);
					$('#help-content').html(content);
				});

			$('.mhelp.' + key)
				.attr('title', content);
		});
	});
}
