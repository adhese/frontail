var extractBetween = function(line, start, end) {
    var a = line.indexOf(start) + start.length;
    var b = line.indexOf(end, a);
    return line.substring(a, b);
};

var extractAmount = function(line) {
    if (line.indexOf('Optional[') < 0) {
        return "EMPTY";
    }
    var str = extractBetween(line, "Optional[", "]) : ");
    return str.replace('(Optional[', '@ ');
};

var getChart = function(auctionId) {
    var chart = ['Browser->Gateway: Request'];

    $('*[class^="line"]')
        .map(function() { return $(this).text(); })
        .filter(function() { return this.indexOf(auctionId) >= 0; })
        .each(function() {
            var line = this;
            if (line.indexOf('Adserver response part received') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");

                chart.push("Gateway->ADSERVER: Request");
                chart.push("Note over ADSERVER: " + duration);
                chart.push("ADSERVER->Gateway: Response");
            } else if (line.indexOf('Market request ready') >= 0) {
                chart.push("Gateway->MARKET: Request");
            } else if (line.indexOf('Market response received') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");

                chart.push("Note over MARKET: " + duration);
                chart.push("MARKET->Gateway: Response");
            } else if (line.indexOf('Adserver bid received') >= 0) {
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Market bid received') >= 0) {
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Ad response ready') >= 0) {
                var duration = extractBetween(line, "(all took PT", ")");
                var winning = extractAmount(line);

                chart.push("Note over Gateway: " + duration);
                chart.push("Gateway->Browser: Response");
                chart.push("Note over Browser: " + winning);
            }
        });

    return chart;
};

var diagram = $('<div/>', {
    id: 'diagram'
});

var draw = function(auctionId) {
    diagram.empty();
    var chart = getChart(auctionId);
    var diagramData = Diagram.parse(chart.join('\n'));
    diagram.dialog({
        minWidth: 600,
        minHeight: 600
    });
    diagramData.drawSVG("diagram", { theme: 'simple' });
};

var auctionUuid = new RegExp('.* ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) .*');

var domScanTimer = null;

var domScan = function() {
    domScanTimer = null;
    $(".head:not(.processed)").each(function() {
        var head = $(this);
        head.addClass('processed');
        var oldHtml = head.html();
        var match = auctionUuid.exec(oldHtml);
        if (match) {
            var auctionId = match[1];
            var linkId = "draw_" + auctionId;
            var newHtml = oldHtml.replace(auctionId, "<a href='#' id='" + linkId + "'>" + auctionId + "</a>");
            head.html(newHtml);
            head.find("#" + linkId).on('click', function() {
                draw(auctionId);
                return false;
            });
        }
    });
};

$(document).ready(function() {
    $("body").append(diagram);
});

$(document).on("DOMNodeInserted", '.line', function() {
    if (!domScanTimer) {
        domScanTimer = setTimeout(domScan, 2000);
    }
});

