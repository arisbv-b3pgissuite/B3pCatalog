<%--
    Document   : header
    Created on : 16-sep-2010, 17:32:26
    Author     : Erik van de Pol
--%>

<%@include file="/WEB-INF/jsp/commons/taglibs.jsp" %>

<div class="ui-layout-ignore">
    <script type="text/javascript">
        $(document).ready(function() {
            $("#main-tabs > li").hover(function() {
                $(this).add("a", this).addClass("main-tab-hover");
            }, function() {
                $(this).add("a", this).removeClass("main-tab-hover");
            });

            $("#main-tabs > li > a").click(function() {
                showTab(this);
                return false;
            });

            showTab($("#main-tabs > li > a").first());
        });

        function showTab(aElem) {
            $("#main-tabs > li > a").each(function() {
                $(this).parent().removeClass("main-tab-selected");
                $($(this).attr("href")).hide();
            });
            $(aElem).parent().addClass("main-tab-selected");
            $($(aElem).attr("href")).show();

            if ($(aElem).attr("href") === "#search")
                searchTabShown();
        }
    </script>
</div>

<div class="ui-layout-content">
    <div class="header">
        <%@include file="branding.jsp" %>
        <div class="nav-bar">
            <div class="title-bar">
                <h1>${title}</h1>
                <div class="login-info-block">
                    <div class="logged-in">
                        <fmt:message key="loggedIn"/>
                    </div>
                    <div class="logged-in-as">
                        <fmt:message key="loggedInAs"/>:
                    </div>
                    <div class="logged-in-as-user">
                        ${pageContext.request.remoteUser}
                    </div>
                    <a href="#" onclick="B3pCatalog.logout();" class="logout-link">Uitloggen</a>
                </div>
            </div>
            <ul id="main-tabs" class="ui-helper-reset">
                <li class="ui-corner-top">
                    <a href="#filetree">Bestanden verkennen</a>
                </li>
                <li class="ui-corner-top">
                    <a href="#search">Catalog doorzoeken</a>
                </li>
            </ul>
        </div>
    </div>
</div>
