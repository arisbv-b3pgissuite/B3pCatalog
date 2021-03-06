<%-- 
    Document   : searchResults
    Created on : 2-feb-2011, 14:54:37
    Author     : Erik van de Pol
--%>

<%@include file="/WEB-INF/jsp/commons/taglibs.jsp" %>

<%@page contentType="text/html" pageEncoding="UTF-8"%>

<script type="text/javascript">
    $(document).ready(function() {
        $("#search-results .search-result-abstract").ThreeDots({
            //max_rows: 2, // is default 2
            alt_text_t: true
        });
        $("#search-results .search-result-title").click(function() {
            $("#search-results .search-result-title").removeClass("search-result-selected");
            $(this).addClass("search-result-selected");
            B3pCatalog.loadMetadataByUUID($(this).attr("uuid"));
        });
    });
</script>

<div id="search-results">
    <c:choose>
        <c:when test="${empty actionBean.metadataList}">
            <div class="message_info">
                Geen resultaten gevonden
            </div>
        </c:when>
        <c:otherwise>
            <div class="search-results-text">
                Resultaten:
            </div>
            <c:forEach items="${actionBean.metadataList}" var="mdDoc">
                <div class="search-result">
                    <div class="search-result-title" uuid="<c:out value="${mdDoc.uuid}"/>">
                        <c:out value="${mdDoc.title}"/>
                    </div>
                    <div class="search-result-abstract">
                        <span class="ellipsis_text"><c:out value="${mdDoc.abstractString}"/></span>
                    </div>
                </div>
            </c:forEach>
        </c:otherwise>
    </c:choose>
</div>
