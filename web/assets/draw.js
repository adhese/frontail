var extractBetween = function(line, start, end) {
    var startIdx = line.indexOf(start);
    if (startIdx < 0) {
        return "";
    }
    var a = startIdx + start.length;
    var b = line.indexOf(end, a);
    if (b < 0) {
        return "";
    }
    return line.substring(a, b);
};


var roundAmount = function(str) {
    return parseFloat(str).toPrecision(3);
};

var extractAmount = function(line) {
    if (line.indexOf('Optional[') < 0) {
        return "EMPTY";
    }
    var str = extractBetween(line, "USD ", " ");
    if (str) {
        return "$" + roundAmount(str);
    }
    return "€" + roundAmount(extractBetween(line, "EUR ", " "));
};

var extractMarketName = function(line) {
    var jsonStart = line.indexOf("{");
    var jsonEnd = line.lastIndexOf("}");
    var json = JSON.parse(line.substring(jsonStart, jsonEnd + 1));
    var id = json.id;
    var marketName = id.slice(0, -("-7dc9556a-b09b-4d7b-914d-3435bd7128c0".length));
    return marketToLabel(marketName);
};

var marketToLabel = function(market) {
    return market.replace("-", "_");
};

var getChart = function(auctionId) {
    var chart = [];

    var binLogPrefix = "Binary log submit: ";

    $('*[class^="line"]')
        .map(function() { return $(this).text(); })
        .filter(function() { return this.indexOf(auctionId) >= 0; })
        .each(function() {
            var line = this;
            if (line.indexOf('Auction processing started') >= 0) {
                var slotName = extractBetween(line, "Auction processing started: ", ":");
                chart.push("Title: Auction on " + slotName);
                chart.push('Browser->Gateway:');
                chart.push("Gateway->ADSERVER:");
            } else if (line.indexOf('Adserver response part received') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");

                chart.push("Note left of Browser: " + duration);
                chart.push("ADSERVER->Gateway:");
            } else if (line.indexOf('Market request ready') >= 0) {
                var market = extractMarketName(line);
                chart.push("Gateway->" + market + ":");
            } else if (line.indexOf('Market response received') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");
                var market = extractBetween(line, "Market response received: ", ": ");

                chart.push("Note left of Browser: " + duration);
                chart.push(marketToLabel(market) + "->Gateway:");
            } else if (line.indexOf('Adserver bid received') >= 0) {
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Market bid received') >= 0) {
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Ad response ready') >= 0) {
                var duration = extractBetween(line, "(all took PT", ")");

                chart.push("Note left of Browser: " + duration);
                chart.push("Gateway->Browser:");
            }
            else if (line.indexOf(binLogPrefix) >= 0) {
                var idx = line.indexOf(binLogPrefix);
                var jsonStr = line.substring(idx + binLogPrefix.length);
                var log = JSON.parse(jsonStr);
                chart.push("Note over Browser: " + (log.currency == 'EUR' ? "€" : "$") + roundAmount(log.amount));
            }
        });

    return chart;
};

var diagram = $('<div/>', {
    id: 'diagram',
    padding: 0
});

var draw = function(auctionId) {
    diagram.empty();
    var chart = getChart(auctionId);
    var diagramData = Diagram.parse(chart.join('\n'));
    diagram.dialog({
        create: function(event, ui) {
            $(event.target).parent().css('position', 'fixed');
        },
        resizeStop: function(event, ui) {
            var position = [(Math.floor(ui.position.left) - $(window).scrollLeft()),
                         (Math.floor(ui.position.top) - $(window).scrollTop())];
            $(event.target).parent().css('position', 'fixed');
            $(dlg).dialog('option','position',position);
        }
    });
    diagramData.drawSVG("diagram", { theme: 'simple' });
  
    setTimeout(function() {
        var svg = $("#diagram svg");
        var w = svg.width();
        var h = svg.height();
        svg.attr("viewBox", "0 0 " + w + " " + h);
        svg.attr("width", "100%");
        svg.attr("height", "100%");
    }, 50);
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

