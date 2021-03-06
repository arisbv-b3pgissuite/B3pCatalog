<%@include file="/WEB-INF/jsp/commons/taglibs.jsp" %>
<%@include file="/WEB-INF/jsp/commons/customization.jsp" %>
<%@include file="/WEB-INF/jsp/commons/urls.jsp" %>

<stripes:layout-render name="/loginPage.jsp" pageTitle="${title} | Loginfout!">
    <stripes:layout-component name="messages">
        <!--div class="mod message_err">
            <h2>U bent de volgende velden vergeten in te vullen</h2>
            <ul class="bullets">
                <li>Wachtwoord</li>
            </ul>
        </div-->
        <div class="mod message_err">
            Loginfout!
        </div>
    </stripes:layout-component>
    <stripes:layout-component name="content">
        <stripes:layout-render name="/loginForm.jsp"/>
    </stripes:layout-component>
</stripes:layout-render>